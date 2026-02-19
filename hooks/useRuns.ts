'use client'

// hooks/useRuns.ts
// Hook pobierający listę ostatnich runów modeli AI z Bridge API.
// Mapuje surowe pola Bridge (run_id, started_at, ended_at, duration_ms) na typy aplikacyjne.

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { RunsResponse, BridgeRunRaw, Run } from '@/types/bridge'

interface UseRunsOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
}

interface UseRunsReturn {
  /** Lista ostatnich runów (max 20). null gdy ładowanie lub offline. */
  runs: Run[] | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
}

/**
 * Mapuje surowy obiekt runu z Bridge API na typ aplikacyjny Run.
 * Bridge zwraca: run_id, started_at, ended_at, duration_ms — aplikacja używa: id, created_at, finished_at, duration_seconds.
 * Brakujące pola (story_title, cost_estimate) wypełniane są undefined/null.
 *
 * Pole Bridge → pole aplikacyjne:
 *   run_id        → id
 *   started_at    → created_at
 *   ended_at      → finished_at
 *   duration_ms   → duration_seconds (przeliczane: ms / 1000)
 *   story_title   → undefined (Bridge nie zwraca)
 *   cost_estimate → null (Bridge nie zwraca)
 */
function mapBridgeRun(raw: BridgeRunRaw): Run {
  return {
    id: raw.run_id,
    story_id: raw.story_id,
    model: raw.model,
    status: raw.status,
    step: raw.step,
    duration_seconds: raw.duration_ms !== null ? raw.duration_ms / 1000 : null,
    cost_estimate: raw.cost_usd ?? null,
    input_tokens: raw.tokens_in ?? undefined,
    output_tokens: raw.tokens_out ?? undefined,
    created_at: raw.started_at,
    finished_at: raw.ended_at ?? null,
  }
}

/**
 * Pobiera listę ostatnich 20 runów z Bridge API.
 * Endpoint: GET /api/status/runs
 */
export function useRuns(options: UseRunsOptions = {}): UseRunsReturn {
  const { refreshInterval = 30000 } = options

  const { data, error, isLoading } = useSWR<RunsResponse | null>(
    '/api/status/runs',
    (path: string) => fetchBridge<RunsResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || (data === null && !isLoading)
  const runs = data?.runs?.map(mapBridgeRun) ?? null

  return {
    runs,
    loading: isLoading,
    offline,
  }
}
