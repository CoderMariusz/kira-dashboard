'use client'

// hooks/useEval.ts
// Hook pobierający wyniki eval framework z Bridge API.
// Mapuje rzeczywisty format Bridge → wewnętrzne typy dashboardu.

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { EvalRecentRun, EvalScore } from '@/types/bridge'

interface UseEvalOptions {
  refreshInterval?: number
}

interface UseEvalReturn {
  scores: EvalScore[] | null
  overallScore: number | null
  lastRunAt: string | null
  recentRuns: EvalRecentRun[] | null
  /** Liczba zadań w ostatnim run. */
  taskCount: number | null
  passedCount: number | null
  loading: boolean
  offline: boolean
}

/** Rzeczywisty format zwracany przez Bridge GET /api/eval/overview */
interface BridgeEvalOverviewRaw {
  generated_at: string
  latest_run: {
    id: string
    run_type: string
    status: string
    started_at: string
    finished_at: string
    overall_score: number
    task_count: number
    passed_count: number
    failed_count: number
    metadata: unknown
  } | null
  category_averages: Record<string, number>
  pass_rate: number
  latest_metrics: Record<string, unknown>
  metric_targets: Record<string, unknown>
}

function mapEvalResponse(raw: BridgeEvalOverviewRaw): {
  scores: EvalScore[]
  overallScore: number
  lastRunAt: string | null
  recentRuns: EvalRecentRun[]
  taskCount: number | null
  passedCount: number | null
} {
  const scores: EvalScore[] = Object.entries(raw.category_averages ?? {}).map(
    ([category, score]) => ({
      category,
      score,
      pass_rate: score,
      total_tests: 0,
      passed_tests: 0,
    })
  )

  return {
    scores,
    overallScore: raw.pass_rate ?? raw.latest_run?.overall_score ?? 0,
    lastRunAt: raw.latest_run?.started_at ?? null,
    recentRuns: [],
    taskCount: raw.latest_run?.task_count ?? null,
    passedCount: raw.latest_run?.passed_count ?? null,
  }
}

export function useEval(options: UseEvalOptions = {}): UseEvalReturn {
  const { refreshInterval = 30000 } = options

  const { data, error, isLoading } = useSWR<BridgeEvalOverviewRaw | null>(
    '/api/eval/overview',
    (path: string) => fetchBridge<BridgeEvalOverviewRaw>(path),
    { refreshInterval, revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const offline = error !== undefined || (data === null && !isLoading)

  if (!data) {
    return { scores: null, overallScore: null, lastRunAt: null, recentRuns: null, taskCount: null, passedCount: null, loading: isLoading, offline }
  }

  const mapped = mapEvalResponse(data)
  return { ...mapped, loading: isLoading, offline }
}
