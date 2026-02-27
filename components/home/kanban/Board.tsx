'use client'

// components/home/kanban/Board.tsx
// Główna logika tablicy kanban z DnD i filtrowaniem — AC-1 to AC-9

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useTasks } from '@/hooks/home/useTasks'
import { useHousehold } from '@/hooks/home/useHousehold'
import { useUser } from '@/contexts/RoleContext'
import { Column } from './Column'
import { TaskDragOverlay } from './TaskDragOverlay'
import { TaskModal } from './TaskModal'
import { BoardSkeleton } from './BoardSkeleton'
import { FilterBar } from './FilterBar'
import type { Task, ColumnWithTasks, TaskCreate } from '@/types/home'

// ═══════════════════════════════════════════════════════════
// Stałe — kolory kropek per pozycja kolumny
// ═══════════════════════════════════════════════════════════

const COLUMN_DOT_COLORS = ['#6b7280', '#f97316', '#4ade80']
const DONE_COLUMN_NAMES = ['gotowe', 'done', 'zrobione', 'completed', 'zakończone']

function getColumnDot(col: ColumnWithTasks, index: number): string {
  return COLUMN_DOT_COLORS[index] ?? '#6b7280'
}

function isDoneColumn(col: ColumnWithTasks): boolean {
  return DONE_COLUMN_NAMES.includes(col.name.toLowerCase())
}

// ═══════════════════════════════════════════════════════════
// Helper: oblicz pozycję nowego zadania na końcu kolumny
// ═══════════════════════════════════════════════════════════

function calcAppendPosition(tasks: Task[]): number {
  if (tasks.length === 0) return 1000
  const maxPos = Math.max(...tasks.map(t => t.position))
  return maxPos + 1000
}

// ═══════════════════════════════════════════════════════════
// Error state
// ═══════════════════════════════════════════════════════════

function BoardErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-[#3a1a1a] bg-[#2a1010] p-8 text-center gap-[10px]">
      <p className="text-[14px] font-medium text-[#f87171]">
        ⚠️ Nie udało się załadować tablicy zadań
      </p>
      <p className="text-[12px] text-[#6b7280]">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="text-[12px] bg-[#2a2540] hover:bg-[#3b3d7a] text-[#e6edf3] px-[14px] py-[7px] rounded-[7px] transition-colors cursor-pointer mt-[4px]"
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Główny komponent Board
// ═══════════════════════════════════════════════════════════

export function Board() {
  // ═══ CURRENT USER ═══
  // NOTE: Use RoleContext instead of supabase.auth.getSession() to avoid
  // Navigator LockManager lock contention that hangs in headless browsers (Playwright).
  const { user: currentUser } = useUser()
  const currentUserId = currentUser?.id ?? null

  // ═══ HOUSEHOLD + TASKS ═══
  const { household, members, loading: householdLoading, error: householdError } = useHousehold()
  const householdId = household?.id
  const { columns, addTask, moveTask, updateTask, deleteTask, loading: tasksLoading, error: tasksError } = useTasks(householdId)

  // ═══ UI STATE ═══
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  // ═══ DnD SENSORS ═══
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  // ═══ FILTROWANIE ZADAŃ ═══
  const filteredColumns = useMemo<ColumnWithTasks[]>(() => {
    if (selectedFilter === 'all') return columns

    return columns.map(col => ({
      ...col,
      tasks: col.tasks.filter(task => {
        if (selectedFilter === 'mine') {
          return task.assigned_to === currentUserId
        }
        return task.assigned_to === selectedFilter
      }),
    }))
  }, [columns, selectedFilter, currentUserId])

  // ═══ ZNAJDŹ ZADANIE PO ID (z unfilteredColumns dla modala) ═══
  const findTask = useCallback(
    (taskId: string): Task | null => {
      for (const col of columns) {
        const found = col.tasks.find(t => t.id === taskId)
        if (found) return found
      }
      return null
    },
    [columns]
  )

  // ═══ DnD HANDLERS ═══
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined
    if (task) setActiveTask(task)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTask(null)
      if (!over) return

      const draggedTask = active.data.current?.task as Task | undefined
      if (!draggedTask) return

      // Ustal docelową kolumnę
      let targetColumnId: string
      let targetTasks: Task[]

      if (over.data.current?.type === 'column') {
        targetColumnId = over.data.current.columnKey as string
        const col = columns.find(c => c.id === targetColumnId)
        targetTasks = col?.tasks ?? []
      } else if (over.data.current?.type === 'task') {
        const overTask = over.data.current.task as Task
        targetColumnId = overTask.column_id
        const col = columns.find(c => c.id === targetColumnId)
        targetTasks = col?.tasks ?? []
      } else {
        return
      }

      // Brak zmiany kolumny
      if (draggedTask.column_id === targetColumnId) return

      // Pozycja: na końcu docelowej kolumny
      const newPosition = calcAppendPosition(targetTasks)

      try {
        await moveTask({ taskId: draggedTask.id, targetColumnId, position: newPosition })
      } catch {
        // Hook obsługuje rollback wewnętrznie
      }
    },
    [columns, moveTask]
  )

  // ═══ QUICK ADD ═══
  const handleQuickAdd = useCallback(
    async (columnId: string, title: string) => {
      if (!householdId) return
      const dto: TaskCreate = {
        household_id: householdId,
        column_id: columnId,
        title,
        priority: 'medium',
      }
      await addTask(dto)
    },
    [householdId, columns, addTask]
  )

  // ═══ LOADING ═══
  const isLoading = householdLoading || tasksLoading
  const error = householdError || tasksError

  if (isLoading) return <BoardSkeleton columns={3} />
  if (error) return <BoardErrorState error={error} />

  // Modal task
  const openTask = openTaskId ? findTask(openTaskId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={(e) => void handleDragEnd(e)}
    >
      {/* FilterBar */}
      <FilterBar
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        members={members}
        currentUserId={currentUserId}
      />

      {/* Tablica kanban — desktop: grid, mobile: flex scroll */}
      <div
        className="
          grid grid-cols-3 gap-[14px]
          max-md:grid-cols-none max-md:flex max-md:overflow-x-auto max-md:gap-[10px] max-md:pb-[10px]
        "
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {filteredColumns.map((col, index) => (
          <Column
            key={col.id}
            columnId={col.id}
            label={col.name}
            dot={getColumnDot(col, index)}
            tasks={col.tasks}
            onTaskClick={setOpenTaskId}
            onQuickAdd={(title) => handleQuickAdd(col.id, title)}
            isDoneColumn={isDoneColumn(col)}
          />
        ))}
      </div>

      {/* Hint mobile */}
      <p className="mt-[8px] text-[10px] text-[#4b4569] text-center md:hidden">
        ← Przewiń by zobaczyć więcej →
      </p>

      {/* Drag overlay */}
      <TaskDragOverlay activeTask={activeTask} />

      {/* Task Modal */}
      {openTaskId && openTask && (
        <TaskModal
          task={openTask}
          columns={columns}
          members={members}
          onClose={() => setOpenTaskId(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </DndContext>
  )
}
