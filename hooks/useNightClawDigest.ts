'use client'
// hooks/useNightClawDigest.ts
// STORY-9.5 — SWR hook for GET /api/nightclaw/digest
// Polls every 60s; revalidateOnFocus: false.

import useSWR, { type KeyedMutator } from 'swr'
import { fetchDigest } from '@/services/nightclaw.service'
import type { DigestResponse } from '@/types/nightclaw'

export interface UseNightClawDigestResult {
  data: DigestResponse | undefined
  isLoading: boolean
  error: Error | undefined
  refresh: KeyedMutator<DigestResponse>
}

/**
 * Hook returning the NightClaw digest for a given date.
 * Automatically re-fetches every 60 seconds.
 *
 * @param date - Optional ISO date string "YYYY-MM-DD". Defaults to today.
 */
export function useNightClawDigest(date?: string): UseNightClawDigestResult {
  const key = date
    ? `/api/nightclaw/digest?date=${date}`
    : '/api/nightclaw/digest'

  const { data, isLoading, error, mutate } = useSWR<DigestResponse, Error>(
    key,
    // SWR passes the key as the first arg; we map it back to the service call
    () => fetchDigest(date),
    {
      refreshInterval: 60_000,
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
