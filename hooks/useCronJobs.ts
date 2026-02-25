'use client'
// hooks/useCronJobs.ts
// STORY-10.6 — SWR hook for GET /api/system/cron-jobs
// Polls every 60 seconds.

import useSWR, { type KeyedMutator } from 'swr'
import { SystemService } from '@/services/system.service'
import type { CronJob } from '@/types/system.types'

export interface UseCronJobsResult {
  jobs: CronJob[] | undefined
  isLoading: boolean
  error: Error | undefined
  refresh: KeyedMutator<CronJob[]>
}

/**
 * Hook returning the list of cron jobs.
 * Automatically re-fetches every 60 seconds.
 */
export function useCronJobs(): UseCronJobsResult {
  const { data, isLoading, error, mutate } = useSWR<CronJob[], Error>(
    '/api/system/cron-jobs',
    () => SystemService.getCronJobs(),
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    }
  )

  return {
    jobs: data,
    isLoading,
    error,
    refresh: mutate,
  }
}
