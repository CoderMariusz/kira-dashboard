'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { createClient } from '@/lib/supabase/client'
import type { ColumnWithTasks, Task, TaskCreate, TaskUpdate, MoveTask } from '@/types/home'

// ──────────────────────────────────────────────────
// Return type
// ──────────────────────────────────────────────────
interface UseTasksReturn {
  columns:    ColumnWithTasks[]
  addTask:    (dto: TaskCreate) => Promise<void>
  moveTask:   (params: MoveTask) => Promise<void>
  updateTask: (taskId: string, updates: TaskUpdate) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  loading:    boolean
  error:      string | null
}

// ──────────────────────────────────────────────────
// Helper: sort tasks by position ASC
// ──────────────────────────────────────────────────
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.position - b.position)
}

// ──────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────
export function useTasks(householdId: string | undefined): UseTasksReturn {
  const [columns, setColumns] = useState<ColumnWithTasks[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // ────────────────────────────────────────────────
  // 1. INITIAL FETCH
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/home/tasks?household_id=${householdId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((body: { data: ColumnWithTasks[] }) => setColumns(body.data ?? []))
      .catch((err: unknown) => {
        setError('Nie udało się załadować zadań')
        console.error('[useTasks] fetchColumns error:', err)
      })
      .finally(() => setLoading(false))
  }, [householdId])

  // ────────────────────────────────────────────────
  // 2. REALTIME SUBSCRIPTION — tasks table
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`tasks:${householdId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'tasks',
          filter: `household_id=eq.${householdId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as unknown as Task
            setColumns(prev => prev.map(col =>
              col.id === newTask.column_id
                ? {
                    ...col,
                    // Remove only the temp task matching this record by title,
                    // leaving other concurrent optimistic tasks intact
                    tasks: sortTasks([
                      ...col.tasks.filter(t => !(t.id.startsWith('temp-') && t.title === newTask.title)),
                      newTask,
                    ]),
                  }
                : col
            ))
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as unknown as Task
            setColumns(prev => prev.map(col => {
              // Task may have moved column — remove from old, add to new
              const tasksWithoutUpdated = col.tasks.filter(t => t.id !== updated.id)
              if (col.id === updated.column_id) {
                return { ...col, tasks: sortTasks([...tasksWithoutUpdated, updated]) }
              }
              return { ...col, tasks: tasksWithoutUpdated }
            }))
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            setColumns(prev => prev.map(col => ({
              ...col,
              tasks: col.tasks.filter(t => t.id !== deletedId),
            })))
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId])

  // ────────────────────────────────────────────────
  // 3. REALTIME SUBSCRIPTION — columns table
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`columns:${householdId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'columns',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          // Column changes are rare — just refetch everything
          fetch(`/api/home/tasks?household_id=${householdId}`)
            .then(r => r.json())
            .then((body: { data: ColumnWithTasks[] }) => setColumns(body.data ?? []))
            .catch(() => {})
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId])

  // ────────────────────────────────────────────────
  // 4. addTask — optimistic INSERT
  // ────────────────────────────────────────────────
  const addTask = useCallback(async (dto: TaskCreate) => {
    if (!householdId) return

    const tempId = `temp-${Date.now()}`
    const optimisticTask: Task = {
      id:           tempId,
      household_id: householdId,
      column_id:    dto.column_id,
      title:        dto.title,
      description:  dto.description ?? null,
      priority:     dto.priority ?? 'medium',
      position:     999999,
      assigned_to:  dto.assigned_to ?? null,
      due_date:     dto.due_date ?? null,
      completed_at: null,
      created_by:   null,
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }

    setColumns(prev => prev.map(col =>
      col.id === dto.column_id
        ? { ...col, tasks: sortTasks([...col.tasks, optimisticTask]) }
        : col
    ))

    try {
      const res = await fetch('/api/home/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...dto, household_id: householdId }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      // Real-time INSERT will replace temp task
    } catch (err) {
      // Rollback
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.filter(t => t.id !== tempId),
      })))
      console.error('[useTasks] addTask error:', err)
      // Re-throw — caller handles toast/display (AC-5: nie crashuj całego board)
      throw err
    }
  }, [householdId])

  // ────────────────────────────────────────────────
  // 5. moveTask — AC-4: optimistic drag & drop
  // ────────────────────────────────────────────────
  const moveTask = useCallback(async ({ taskId, targetColumnId, position }: MoveTask) => {
    // Find task and its current column
    let movedTask: Task | undefined
    let sourceColumnId: string | undefined

    for (const col of columns) {
      const found = col.tasks.find(t => t.id === taskId)
      if (found) {
        movedTask = found
        sourceColumnId = col.id
        break
      }
    }
    if (!movedTask || !sourceColumnId) return

    const previousColumns = columns // snapshot for rollback

    // Optimistic: move task between columns
    setColumns(prev => prev.map(col => {
      if (col.id === sourceColumnId) {
        return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) }
      }
      if (col.id === targetColumnId) {
        const updated: Task = { ...movedTask!, column_id: targetColumnId, position }
        return { ...col, tasks: sortTasks([...col.tasks, updated]) }
      }
      return col
    }))

    try {
      const res = await fetch(`/api/home/tasks/${taskId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ column_id: targetColumnId, position }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      // Rollback
      setColumns(previousColumns)
      console.error('[useTasks] moveTask error:', err)
      // Re-throw — caller handles toast/display (AC-5: nie crashuj całego board)
      throw err
    }
  }, [columns])

  // ────────────────────────────────────────────────
  // 6. updateTask — optimistic UPDATE
  // ────────────────────────────────────────────────
  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    const previousColumns = columns

    setColumns(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    })))

    try {
      const res = await fetch(`/api/home/tasks/${taskId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updates),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      setColumns(previousColumns)
      console.error('[useTasks] updateTask error:', err)
      // Re-throw — caller handles toast/display (AC-5: nie crashuj całego board)
      throw err
    }
  }, [columns])

  // ────────────────────────────────────────────────
  // 7. deleteTask — optimistic DELETE
  // ────────────────────────────────────────────────
  const deleteTask = useCallback(async (taskId: string) => {
    const previousColumns = columns

    setColumns(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks.filter(t => t.id !== taskId),
    })))

    try {
      const res = await fetch(`/api/home/tasks/${taskId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      setColumns(previousColumns)
      console.error('[useTasks] deleteTask error:', err)
      // Re-throw — caller handles toast/display (AC-5: nie crashuj całego board)
      throw err
    }
  }, [columns])

  return { columns, addTask, moveTask, updateTask, deleteTask, loading, error }
}
