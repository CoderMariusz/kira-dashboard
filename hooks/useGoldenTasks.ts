'use client'

/**
 * hooks/useGoldenTasks.ts
 * STORY-7.6 — Custom hook for golden tasks CRUD operations.
 */

import { useState, useEffect, useCallback } from 'react'
import type { EvalTask, EvalCategory, EvalModel } from '@/lib/eval/types'

export interface CreateTaskInput {
  prompt: string
  expected_output: string
  category: EvalCategory
  target_model: EvalModel
  is_active?: boolean
}

export interface UpdateTaskInput {
  prompt?: string
  expected_output?: string
  category?: EvalCategory
  target_model?: EvalModel
  is_active?: boolean
}

export interface UseGoldenTasksResult {
  tasks: EvalTask[]
  loading: boolean
  error: string | null
  createTask: (input: CreateTaskInput) => Promise<void>
  updateTask: (id: string, input: UpdateTaskInput) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  refresh: () => void
}

export function useGoldenTasks(category?: string): UseGoldenTasksResult {
  const [tasks, setTasks] = useState<EvalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchTasks() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (category) params.set('category', category)
        params.set('active_only', 'false')

        const res = await fetch(`/api/eval/tasks?${params.toString()}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
        }
        const data = await res.json() as { tasks?: EvalTask[] }
        if (!cancelled) {
          setTasks(Array.isArray(data.tasks) ? data.tasks : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Błąd pobierania danych')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchTasks()
    return () => {
      cancelled = true
    }
  }, [category, refreshKey])

  const createTask = useCallback(async (input: CreateTaskInput): Promise<void> => {
    const res = await fetch('/api/eval/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    refresh()
  }, [refresh])

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput): Promise<void> => {
    const res = await fetch(`/api/eval/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    refresh()
  }, [refresh])

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/eval/tasks/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    refresh()
  }, [refresh])

  return { tasks, loading, error, createTask, updateTask, deleteTask, refresh }
}
