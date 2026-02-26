'use client'

// hooks/useEpics.ts
// STORY-12.8 — Hook to fetch epics with progress from Supabase via /api/epics endpoint.

import useSWR from 'swr'
import type { EpicsResponse, EpicWithProgress } from '@/types/api'

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchEpics(url: string): Promise<EpicsResponse | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.warn('[useEpics] /api/epics returned', res.status)
      return null
    }
    return (await res.json()) as EpicsResponse
  } catch (err) {
    console.warn('[useEpics] /api/epics fetch failed:', err)
    return null
  }
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseEpicsReturn {
  /** List of epics with progress. null when loading or error. */
  epics: EpicWithProgress[] | null
  /** true during initial load. */
  loading: boolean
  /** true when offline or error. */
  offline: boolean
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches epics with progress from /api/epics (Supabase).
 * Used by Overview page and Pipeline sidebar.
 *
 * @param projectKey - project_id to filter by (default: 'kira-dashboard')
 * @param refreshInterval - polling interval in ms (default: 60000)
 */
export function useEpics(
  projectKey: string = 'kira-dashboard',
  refreshInterval: number = 60_000
): UseEpicsReturn {
  const { data, error, isLoading } = useSWR<EpicsResponse | null>(
    `/api/epics?project=${projectKey}`,
    fetchEpics,
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || (data === null && !isLoading)
  const epics = data?.data ?? null

  return {
    epics,
    loading: isLoading,
    offline,
  }
}
