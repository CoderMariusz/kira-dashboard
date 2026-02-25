'use client'
// hooks/useNightClawSkillsDiff.ts
// STORY-9.5 — SWR hook for GET /api/nightclaw/skills-diff
// Polls every 300s; revalidateOnFocus: false.

import useSWR, { type KeyedMutator } from 'swr'
import { fetchSkillsDiff } from '@/services/nightclaw.service'
import type { SkillsDiffResponse } from '@/types/nightclaw'

export interface UseNightClawSkillsDiffResult {
  data: SkillsDiffResponse | undefined
  isLoading: boolean
  error: Error | undefined
  refresh: KeyedMutator<SkillsDiffResponse>
}

/**
 * Hook returning the NightClaw skills diff (SKILL.md changes).
 * Automatically re-fetches every 300 seconds.
 */
export function useNightClawSkillsDiff(): UseNightClawSkillsDiffResult {
  const { data, isLoading, error, mutate } = useSWR<SkillsDiffResponse, Error>(
    '/api/nightclaw/skills-diff',
    fetchSkillsDiff,
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
