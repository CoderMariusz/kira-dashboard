'use client'

// hooks/useEval.ts
// Hook pobierający wyniki eval framework z Bridge API.

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { EvalOverviewResponse, EvalRecentRun, EvalScore } from '@/types/bridge'

interface UseEvalOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
}

interface UseEvalReturn {
  /** Lista wyników per kategoria. null gdy ładowanie lub offline. */
  scores: EvalScore[] | null
  /** Łączny wynik 0.0-1.0. null gdy ładowanie lub offline. */
  overallScore: number | null
  /** ISO 8601 timestamp ostatniego eval run. null gdy brak lub offline. */
  lastRunAt: string | null
  /** Historia ostatnich 5 runów eval. null gdy ładowanie lub offline. */
  recentRuns: EvalRecentRun[] | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
}

/**
 * Pobiera wyniki eval framework per kategoria z Bridge API.
 * Endpoint: GET /api/eval/overview
 */
export function useEval(options: UseEvalOptions = {}): UseEvalReturn {
  const { refreshInterval = 30000 } = options

  const { data, error, isLoading } = useSWR<EvalOverviewResponse | null>(
    '/api/eval/overview',
    (path: string) => fetchBridge<EvalOverviewResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || (data === null && !isLoading)

  return {
    scores: data?.scores ?? null,
    overallScore: data?.overall_score ?? null,
    lastRunAt: data?.last_run_at ?? null,
    recentRuns: data?.recent_runs ?? null,
    loading: isLoading,
    offline,
  }
}
