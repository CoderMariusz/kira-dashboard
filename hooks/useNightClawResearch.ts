'use client'
// hooks/useNightClawResearch.ts
// STORY-9.5 — SWR hook for GET /api/nightclaw/research
// Polls every 300s; revalidateOnFocus: false.

import useSWR, { type KeyedMutator } from 'swr'
import { fetchResearch } from '@/services/nightclaw.service'
import type { ResearchResponse } from '@/types/nightclaw'

export interface UseNightClawResearchResult {
  data: ResearchResponse | undefined
  isLoading: boolean
  error: Error | undefined
  refresh: KeyedMutator<ResearchResponse>
}

/**
 * Hook returning the NightClaw research files (solutions/).
 * Automatically re-fetches every 300 seconds.
 */
export function useNightClawResearch(): UseNightClawResearchResult {
  const { data, isLoading, error, mutate } = useSWR<ResearchResponse, Error>(
    '/api/nightclaw/research',
    fetchResearch,
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
