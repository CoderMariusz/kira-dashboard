'use client'

/**
 * lib/eval/services.ts
 * STORY-7.6 — SWR-based hooks and CRUD functions for EvalTask entities.
 * Fetches from /api/eval/tasks.
 */

import useSWR from 'swr'
import type { EvalCategory, EvalTask } from '@/lib/eval/types'

// ─── Fetcher ────────────────────────────────────────────────────────────────

const fetcher = async (url: string): Promise<EvalTask[]> => {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as { tasks: EvalTask[] }
  return Array.isArray(data.tasks) ? data.tasks : []
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseEvalTasksResult {
  tasks: EvalTask[]
  isLoading: boolean
  mutate: () => void
}

export function useEvalTasks(category?: EvalCategory): UseEvalTasksResult {
  const params = new URLSearchParams({ active_only: 'false' })
  if (category) params.set('category', category)

  const key = `/api/eval/tasks?${params.toString()}`

  const { data, isLoading, mutate } = useSWR<EvalTask[]>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  })

  return {
    tasks: data ?? [],
    isLoading,
    mutate: () => void mutate(),
  }
}

// ─── CRUD functions ──────────────────────────────────────────────────────────

export type CreateTaskPayload = Omit<EvalTask, 'id' | 'created_at' | 'updated_at'>

export async function createEvalTask(data: CreateTaskPayload): Promise<EvalTask> {
  const res = await fetch('/api/eval/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  const body = await res.json() as { task: EvalTask }
  return body.task
}

export async function updateEvalTask(id: string, data: Partial<EvalTask>): Promise<EvalTask> {
  const res = await fetch(`/api/eval/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  const body = await res.json() as { task: EvalTask }
  return body.task
}

export async function deleteEvalTask(id: string): Promise<void> {
  const res = await fetch(`/api/eval/tasks/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
}
