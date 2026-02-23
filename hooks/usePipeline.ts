'use client'

// hooks/usePipeline.ts
// Hook pobierający listę aktywnych stories z Bridge API.
// Mapuje surowe pola Bridge (story_id, epic_id, model) na typy aplikacyjne (id, epic, assigned_model).
// STORY-5.9: Hybrid Mode — gdy NEXT_PUBLIC_BRIDGE_MODE=offline lub Bridge offline,
//            pobiera dane z /api/sync/status (Supabase fallback).

import useSWR from 'swr'
import { useMemo } from 'react'
import { fetchBridge } from '@/lib/bridge'
import type { PipelineResponse, BridgeStoryRaw, Story } from '@/types/bridge'
import type { SyncStatusResponse, BridgeSyncStory } from '@/types/api'

interface UsePipelineOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
  /**
   * Klucz projektu do filtrowania stories, np. "kira-dashboard".
   * Domyślnie: zmienna środowiskowa NEXT_PUBLIC_BRIDGE_PROJECT lub "kira-dashboard".
   */
  projectKey?: string
}

export interface UsePipelineReturn {
  /** Lista stories. null gdy ładowanie lub offline. */
  stories: Story[] | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
  /** true gdy dane pochodzą z Supabase (Hybrid Mode fallback). */
  isOfflineMode: boolean
  /** ISO timestamp ostatniej synchronizacji z Supabase. null gdy Bridge online lub brak danych. */
  syncedAt: string | null
}

/**
 * Mapuje surowy obiekt story z Bridge API na typ aplikacyjny Story.
 * Bridge zwraca: story_id, epic_id, model — aplikacja używa: id, epic, assigned_model.
 * Brakujące pola (domain, difficulty) wypełniane są null.
 */
function mapBridgeStory(raw: BridgeStoryRaw): Story {
  return {
    id: raw.story_id,
    title: raw.title,
    epic: raw.epic_id,
    status: raw.status,
    domain: null,
    difficulty: null,
    assigned_model: raw.model,
    started_at: raw.started_at ?? null,
    updated_at: raw.updated_at ?? new Date().toISOString(),
  }
}

/**
 * Maps a Supabase bridge_stories row to the app-level Story type.
 * Used in Hybrid Mode when Bridge is offline.
 */
function mapSyncStory(raw: BridgeSyncStory): Story {
  return {
    id: raw.id,
    title: raw.title,
    epic: raw.epic_id,
    status: raw.status as Story['status'],
    domain: null,
    difficulty: null,
    assigned_model: raw.model,
    started_at: raw.started_at ?? null,
    updated_at: raw.updated_at ?? raw.synced_at,
  }
}

/** true when the app is configured to always use Supabase (e.g. on Vercel). */
const IS_FORCED_OFFLINE = process.env.NEXT_PUBLIC_BRIDGE_MODE === 'offline'

/**
 * Fetcher for /api/sync/status — always a local Next.js API route.
 * Returns null on error (matches fetchBridge() contract).
 */
async function fetchSyncStatus(): Promise<SyncStatusResponse | null> {
  try {
    const res = await fetch('/api/sync/status', { cache: 'no-store' })
    if (!res.ok) {
      console.warn('[usePipeline] /api/sync/status returned', res.status)
      return null
    }
    return (await res.json()) as SyncStatusResponse
  } catch (err) {
    console.warn('[usePipeline] /api/sync/status fetch failed:', err)
    return null
  }
}

/**
 * Pobiera listę aktywnych stories z Bridge API (lub z Supabase w Hybrid Mode).
 *
 * Tryb Bridge (domyślny, lokalnie):
 *   Endpoint: GET /api/status/pipeline?project={projectKey}
 *   Zwraca: { stories, loading, offline, isOfflineMode: false, syncedAt: null }
 *
 * Tryb Supabase (NEXT_PUBLIC_BRIDGE_MODE=offline lub Bridge offline):
 *   Endpoint: GET /api/sync/status (Next.js → Supabase)
 *   Zwraca: { stories, loading, offline, isOfflineMode: true, syncedAt: "2026-..." }
 *
 * Pole Bridge → pole aplikacyjne:
 *   story_id      → id
 *   epic_id       → epic
 *   model         → assigned_model
 *   domain        → null (Bridge nie zwraca)
 *   difficulty    → null (Bridge nie zwraca)
 */
export function usePipeline(options: UsePipelineOptions = {}): UsePipelineReturn {
  const {
    refreshInterval = 30000,
    projectKey = process.env.NEXT_PUBLIC_BRIDGE_PROJECT ?? 'kira-dashboard',
  } = options

  // ─── Bridge mode (default) ────────────────────────────────────────────
  const {
    data: bridgeData,
    error: bridgeError,
    isLoading: bridgeLoading,
  } = useSWR<PipelineResponse | null>(
    !IS_FORCED_OFFLINE ? `/api/status/pipeline?project=${projectKey}` : null,
    (path: string) => fetchBridge<PipelineResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // Bridge is considered offline when: error, or data is null (not loading), or forced offline
  const bridgeOffline =
    IS_FORCED_OFFLINE ||
    bridgeError !== undefined ||
    (bridgeData === null && !bridgeLoading)

  // ─── Supabase fallback mode ───────────────────────────────────────────
  // Activates when: forced offline OR bridge has returned (not loading) AND is offline
  const useSyncFallback = IS_FORCED_OFFLINE || (!bridgeLoading && bridgeOffline)

  const {
    data: syncData,
    error: syncError,
    isLoading: syncLoading,
  } = useSWR<SyncStatusResponse | null>(
    useSyncFallback ? '/api/sync/status' : null,
    fetchSyncStatus,
    {
      refreshInterval: refreshInterval > 0 ? Math.max(refreshInterval, 60000) : 0,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // ─── Combine results ──────────────────────────────────────────────────

  const isOfflineMode = useSyncFallback

  // useMemo: creates new reference ONLY when underlying data changes.
  // Without this, .map() creates a new array on every render, causing
  // infinite loops in useLivePipeline (useEffect([baseStories]) fires constantly).
  const bridgeStories = useMemo(
    () => (bridgeData?.stories?.map(mapBridgeStory) ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bridgeData?.stories]
  )

  const syncStories = useMemo(() => {
    if (!syncData) return null
    // Flatten all stories from all epics
    const all: Story[] = []
    for (const epic of syncData.epics) {
      for (const story of epic.stories) {
        all.push(mapSyncStory(story))
      }
    }
    return all.length > 0 ? all : null
  }, [syncData])

  const stories = isOfflineMode ? syncStories : bridgeStories
  const loading = isOfflineMode ? syncLoading : bridgeLoading
  const offline =
    isOfflineMode
      ? (syncError !== undefined || (syncData === null && !syncLoading))
      : bridgeOffline

  const syncedAt = isOfflineMode ? (syncData?.synced_at ?? null) : null

  return {
    stories,
    loading,
    offline,
    isOfflineMode,
    syncedAt,
  }
}
