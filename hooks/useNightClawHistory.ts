'use client'
// hooks/useNightClawHistory.ts
// STORY-9.5 — SWR hook for GET /api/nightclaw/history
// Polls every 300s; revalidateOnFocus: false.

import useSWR, { type KeyedMutator } from 'swr'
import { fetchHistory } from '@/services/nightclaw.service'
import type { HistoryResponse } from '@/types/nightclaw'

export interface UseNightClawHistoryResult {
  data: HistoryResponse | undefined
  isLoading: boolean
  error: Error | undefined
  refresh: KeyedMutator<HistoryResponse>
}

/**
 * Hook returning the NightClaw run history.
 * Automatically re-fetches every 300 seconds.
 */
export function useNightClawHistory(): UseNightClawHistoryResult {
  const { data, isLoading, error, mutate } = useSWR<HistoryResponse, Error>(
    '/api/nightclaw/history',
    fetchHistory,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    }
  )

  return {
    data,
    isLoading,
    error,
    refresh: mutate,
  }
}
