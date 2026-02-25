'use client'
// hooks/useSystemStatus.ts
// STORY-10.6 — SWR hook for GET /api/system/status
// Polls every 30s; revalidateOnFocus: false.

import useSWR, { type KeyedMutator } from 'swr'
import { SystemService } from '@/services/system.service'
import type { SystemStatusResponse } from '@/types/system.types'

export interface UseSystemStatusResult {
  data: SystemStatusResponse | undefined
  isLoading: boolean
  error: Error | undefined
  refresh: KeyedMutator<SystemStatusResponse>
}

/**
 * Hook returning the system status (OpenClaw + Bridge health).
 * Automatically re-fetches every 30 seconds.
 * Does not revalidate on window focus.
 */
export function useSystemStatus(): UseSystemStatusResult {
  const { data, isLoading, error, mutate } = useSWR<SystemStatusResponse, Error>(
    '/api/system/status',
    () => SystemService.getStatus(),
    {
      refreshInterval: 30_000,
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
