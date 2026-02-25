'use client'

// hooks/useProjectStats.ts
// Hook do pobierania statystyk projektów i odświeżania listy po rejestracji nowego projektu.
// Implemented in STORY-6.5 / STORY-6.6

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { KeyedMutator } from 'swr'
import type { ProjectsResponse } from '@/types/bridge'

// ─── SWR key ──────────────────────────────────────────────────────────────────

export const PROJECTS_SWR_KEY = '/api/projects'

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseProjectStatsReturn {
  /** Liczba zarejestrowanych projektów. null gdy ładowanie lub offline. */
  projectsCount: number | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
  /** SWR mutate — wywołaj po rejestracji nowego projektu żeby odświeżyć cache. */
  mutate: KeyedMutator<ProjectsResponse | null>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Pobiera listę projektów z Bridge API i udostępnia mutate() do odświeżania.
 * Wywołaj mutate() po pomyślnej rejestracji nowego projektu.
 *
 * Przykład:
 *   const { mutate } = useProjectStats()
 *   // po sukcesie createFromPrd:
 *   await mutate()
 */
export function useProjectStats(): UseProjectStatsReturn {
  const { data, error, isLoading, mutate } = useSWR<ProjectsResponse | null>(
    PROJECTS_SWR_KEY,
    (path: string) => fetchBridge<ProjectsResponse>(path),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || (data === null && !isLoading)
  const projectsCount = data?.projects?.length ?? null

  return {
    projectsCount,
    loading: isLoading,
    offline,
    mutate,
  }
}
