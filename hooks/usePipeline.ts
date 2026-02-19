'use client'

// hooks/usePipeline.ts
// Hook pobierający listę aktywnych stories z Bridge API.
// Mapuje surowe pola Bridge (story_id, epic_id, model) na typy aplikacyjne (id, epic, assigned_model).

import useSWR from 'swr'
import { useMemo } from 'react'
import { fetchBridge } from '@/lib/bridge'
import type { PipelineResponse, BridgeStoryRaw, Story } from '@/types/bridge'

interface UsePipelineOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
  /**
   * Klucz projektu do filtrowania stories, np. "kira-dashboard".
   * Domyślnie: zmienna środowiskowa NEXT_PUBLIC_BRIDGE_PROJECT lub "kira-dashboard".
   */
  projectKey?: string
}

interface UsePipelineReturn {
  /** Lista stories. null gdy ładowanie lub offline. */
  stories: Story[] | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
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
 * Pobiera listę aktywnych stories z Bridge API.
 * Endpoint: GET /api/status/pipeline?project={projectKey}
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

  const { data, error, isLoading } = useSWR<PipelineResponse | null>(
    `/api/status/pipeline?project=${projectKey}`,
    (path: string) => fetchBridge<PipelineResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || (data === null && !isLoading)

  // useMemo: tworzy nową referencję tablicy TYLKO gdy data.stories się zmienia.
  // Bez tego .map() zwraca nową tablicę przy każdym renderze, co powoduje
  // infinite loop w useLivePipeline (useEffect([baseStories]) odpala się non-stop).
  const stories = useMemo(
    () => data?.stories?.map(mapBridgeStory) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.stories]
  )

  return {
    stories,
    loading: isLoading,
    offline,
  }
}
