'use client'

// hooks/useProjects.ts
// Hook pobierający listę projektów Kira z Bridge API.

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { ProjectsResponse, Project } from '@/types/bridge'

interface UseProjectsOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
}

interface UseProjectsReturn {
  /** Lista zarejestrowanych projektów. null gdy ładowanie lub offline. */
  projects: Project[] | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
}

/**
 * Pobiera listę wszystkich zarejestrowanych projektów z Bridge API.
 * Endpoint: GET /api/projects
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { refreshInterval = 30000 } = options

  const { data, error, isLoading } = useSWR<ProjectsResponse | null>(
    '/api/projects',
    (path: string) => fetchBridge<ProjectsResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || (data === null && !isLoading)
  const projects = data?.projects ?? null

  return {
    projects,
    loading: isLoading,
    offline,
  }
}
