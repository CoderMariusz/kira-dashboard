'use client'
// hooks/useApiKeys.ts
// STORY-10.6 — SWR hook for GET /api/system/api-keys
// Polls every 5 minutes (300s).

import useSWR, { type KeyedMutator } from 'swr'
import { SystemService } from '@/services/system.service'
import type { ApiKeyMeta } from '@/types/system.types'

export interface UseApiKeysResult {
  keys: ApiKeyMeta[] | undefined
  isLoading: boolean
  error: Error | undefined
  refresh: KeyedMutator<ApiKeyMeta[]>
}

/**
 * Hook returning the list of API key metadata.
 * Automatically re-fetches every 5 minutes.
 */
export function useApiKeys(): UseApiKeysResult {
  const { data, isLoading, error, mutate } = useSWR<ApiKeyMeta[], Error>(
    '/api/system/api-keys',
    () => SystemService.getApiKeys(),
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    }
  )

  return {
    keys: data,
    isLoading,
    error,
    refresh: mutate,
  }
}
