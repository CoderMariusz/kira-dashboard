'use client'

/**
 * lib/eval/services.ts
 * STORY-7.8 — SWR hooks for eval run history and detail.
 * Also re-exports CRUD functions for STORY-7.6 Golden Tasks components.
 */

import useSWR from 'swr'
import type {
  EvalTask,
  EvalCategory,
  EvalRun,
  EvalRunDetail,
  EvalRunsListResponse,
  EvalTaskResult,
  EvalRunDiff,
} from './types'

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// ─── Raw API shapes (from STORY-7.4 bridge) ───────────────────────────────────

interface RawEvalRun {
  id: string
  run_type: string
  status: string
  started_at: string
  finished_at: string | null
  overall_score: number | null
  task_count: number
  passed_count: number
  failed_count: number
}

interface RawRunsResponse {
  runs: RawEvalRun[]
  total: number
  page: number
  pageSize: number
}

interface RawTaskResult {
  id: string
  run_id: string
  task_id: string
  actual_output: string | null
  passed: boolean
  diff_score: number   // 0–1
  created_at: string
  task_prompt: string | null
  task_category: string | null
}

interface RawDiff {
  newFailures: string[]
  newPasses: string[]
  unchanged: number
}

interface RawRunDetail {
  run: RawEvalRun
  taskResults: RawTaskResult[]
  diff: RawDiff | null
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapStatus(s: string): EvalRun['status'] {
  switch (s) {
    case 'completed': return 'completed'
    case 'failed':    return 'failed'
    case 'running':   return 'running'
    case 'error':     return 'error'
    default:          return 'pending'
  }
}

function mapRawRun(r: RawEvalRun): EvalRun {
  return {
    id: r.id,
    run_type: r.run_type,
    status: mapStatus(r.status),
    started_at: r.started_at,
    finished_at: r.finished_at,
    overall_score: r.overall_score !== null ? Math.round(r.overall_score * 100) : 0,
    task_count: r.task_count,
    passed_count: r.passed_count,
    failed_count: r.failed_count,
  }
}

function mapRawTaskResult(r: RawTaskResult): EvalTaskResult {
  return {
    id: r.id,
    task_id: r.task_id,
    run_id: r.run_id,
    prompt: r.task_prompt ?? r.task_id,
    category: r.task_category ?? 'Unknown',
    status: r.passed ? 'pass' : 'fail',
    diff_score: Math.round(r.diff_score * 100),
    diff_lines: [],          // diff_lines come from backend (STORY-7.4); empty fallback
    expected_output: '',     // not available from this API endpoint
    actual_output: r.actual_output,
    created_at: r.created_at,
  }
}

function mapRawDiff(d: RawDiff | null): EvalRunDiff | null {
  if (!d) return null
  return {
    has_previous: true,
    fixed: d.newPasses.length,
    new_failures: d.newFailures.length,
    unchanged: d.unchanged,
  }
}

// ─── useEvalRuns ──────────────────────────────────────────────────────────────

interface UseEvalRunsReturn {
  runs: EvalRun[]
  total: number
  hasMore: boolean
  isLoading: boolean
  mutate: () => void
}

export function useEvalRuns(limit = 20): UseEvalRunsReturn {
  const { data, isLoading, mutate } = useSWR<{ runs: EvalRun[]; total: number }>(
    `/api/eval/runs?page=1&pageSize=${limit}`,
    async (url: string) => {
      const raw = await fetcher<RawRunsResponse>(url)
      return {
        runs: raw.runs.map(mapRawRun),
        total: raw.total,
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const runs = data?.runs ?? []
  const total = data?.total ?? 0

  return {
    runs,
    total,
    hasMore: runs.length < total,
    isLoading,
    mutate: () => { void mutate() },
  }
}

// ─── useEvalRunDetail ─────────────────────────────────────────────────────────

interface UseEvalRunDetailReturn {
  run: EvalRun | null
  taskResults: EvalTaskResult[]
  diff: EvalRunDiff | null
  isLoading: boolean
}

export function useEvalRunDetail(runId: string | null): UseEvalRunDetailReturn {
  const { data, isLoading } = useSWR<EvalRunDetail>(
    runId ? `/api/eval/runs/${runId}` : null,
    async (url: string) => {
      const raw = await fetcher<RawRunDetail>(url)
      return {
        run: mapRawRun(raw.run),
        task_results: raw.taskResults.map(mapRawTaskResult),
        diff: mapRawDiff(raw.diff),
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  return {
    run: data?.run ?? null,
    taskResults: data?.task_results ?? [],
    diff: data?.diff ?? null,
    isLoading,
  }
}

// ─── EvalTask CRUD (used by STORY-7.6 Golden Tasks components) ────────────────

export interface UseEvalTasksReturn {
  tasks: EvalTask[]
  isLoading: boolean
  mutate: () => void
}

export function useEvalTasks(category?: EvalCategory): UseEvalTasksReturn {
  const params = new URLSearchParams({ active_only: 'false' })
  if (category) params.set('category', category)
  const key = `/api/eval/tasks?${params.toString()}`

  const { data, isLoading, mutate } = useSWR<{ tasks: EvalTask[] }>(
    key,
    async (url: string) => {
      const body = await fetcher<{ tasks: EvalTask[] }>(url)
      return { tasks: Array.isArray(body.tasks) ? body.tasks : [] }
    },
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  )

  return {
    tasks: data?.tasks ?? [],
    isLoading,
    mutate: () => { void mutate() },
  }
}

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
  const res = await fetch(`/api/eval/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
}
