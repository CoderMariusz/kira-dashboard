'use client'
// hooks/useModelMetrics.ts
// SWR hook for per-model time-series metrics — GET /api/models/[alias]/metrics (STORY-5.4).
// Passing alias=null suppresses all fetching (AC-4).
import useSWR from 'swr'
import type { ModelMetricsResponse } from '@/types/models'

// Human-readable error messages keyed by HTTP status code.
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Nieprawidłowe żądanie',
  401: 'Brak dostępu — zaloguj się ponownie',
  403: 'Brak uprawnień',
  404: 'Nie znaleziono modelu',
  500: 'Błąd serwera — spróbuj ponownie',
}

async function fetchMetrics(url: string): Promise<ModelMetricsResponse> {
  const res = await fetch(url)
  if (!res.ok) {
    const message = ERROR_MESSAGES[res.status] ?? `Błąd ${res.status}`
    throw new Error(message)
  }
  return res.json() as Promise<ModelMetricsResponse>
}

export interface UseModelMetricsResult {
  metrics: ModelMetricsResponse | null
  isLoading: boolean
  error: Error | undefined
}

/**
 * Hook returning time-series metrics for a single model.
 *
 * @param alias - Short model alias (e.g. "kimi"). Pass null to skip fetching (AC-4).
 * @param period - "7d" or "30d"
 *
 * @example
 * const { metrics, isLoading } = useModelMetrics('kimi', '7d')
 * if (isLoading) return <Spinner />
 * if (!metrics) return null
 * return <MetricsChart points={metrics.points} />
 */
export function useModelMetrics(
  alias: string | null,
  period: '7d' | '30d'
): UseModelMetricsResult {
  // Array key gives SWR a stable cache key per (alias, period).
  // null key → SWR skips all fetching (AC-4).
  const key = alias !== null
    ? [`/api/models/${alias}/metrics`, period]
    : null

  const { data, isLoading, error } = useSWR<ModelMetricsResponse, Error>(
    key,
    // Fetcher receives the key array; ignore it and use the pre-built URL.
    key ? () => fetchMetrics(`/api/models/${alias}/metrics?period=${period}`) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  )

  return {
    metrics: data ?? null,
    // When alias is null we are not fetching → isLoading must always be false (AC-4).
    isLoading: alias !== null ? isLoading : false,
    error,
  }
}
