'use client'

// hooks/useStoryActions.ts
// Hook do operacji zapisu (start/advance story) z optimistic UI.
// Implementuje STORY-2.4.

import { useState, useCallback } from 'react'
import { mutate } from 'swr'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { UseStoryActionsReturn } from '@/types/sse.types'
import type { PipelineResponse } from '@/types/bridge'

/**
 * Zwraca SWR klucz dla pipeline — musi pasować dokładnie do klucza używanego w usePipeline.
 * usePipeline używa: `/api/status/pipeline?project=${projectKey}`
 */
function getPipelineSWRKey(projectKey: string): string {
  return `/api/status/pipeline?project=${projectKey}`
}

/**
 * Hook do write operations na stories z optimistic UI.
 *
 * Strategia optimistic update:
 * 1. Przed fetch: SWR mutate aktualizuje cache lokalnie (bez rewalidacji)
 * 2. Po sukcesie: SWR mutate bez danych — wymusza fresh fetch z serwera
 * 3. Po błędzie: SWR mutate bez danych — rollback przez rewalidację
 *
 * @param projectKey - Klucz projektu do dopasowania SWR key. Domyślnie "kira-dashboard".
 * @returns UseStoryActionsReturn
 */
export function useStoryActions(
  projectKey: string = process.env.NEXT_PUBLIC_BRIDGE_PROJECT ?? 'kira-dashboard'
): UseStoryActionsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pipelineSWRKey = getPipelineSWRKey(projectKey)

  /**
   * Uruchamia story — ustawia status na IN_PROGRESS.
   * Wywołuje POST /api/stories/{id}/start z optimistic update.
   *
   * @param id - Identyfikator story, np. "STORY-1.3"
   */
  const startStory = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)

    // KROK 1: Optimistic update — zaktualizuj SWR cache natychmiast
    // false = nie rewaliduj z serwera (czekamy na fetch poniżej)
    await mutate<PipelineResponse | null>(
      pipelineSWRKey,
      (current: PipelineResponse | null | undefined) => {
        if (!current) return current
        return {
          ...current,
          stories: current.stories.map(s =>
            s.story_id === id ? { ...s, status: 'IN_PROGRESS' as const } : s
          ),
        }
      },
      false
    )

    try {
      // KROK 2: Wyślij request do serwera
      const response = await apiFetch(`/api/stories/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      // KROK 2a: Obsłuż tryb queued — pokaż toast gdy komenda w kolejce
      const data = await response.json().catch(() => ({})) as Record<string, unknown>
      if (data['mode'] === 'queued') {
        toast(data['message'] as string ?? 'Komenda w kolejce — Bridge przetworzy w ciągu minuty', {
          duration: 6000,
          style: {
            background: '#1a2a3a',
            border: '1px solid #1e3a6e',
            color: '#93c5fd',
          },
        })
      }

      // KROK 3: Sukces — rewaliduj SWR żeby potwierdzić stan z serwera
      await mutate(pipelineSWRKey)
      setLoading(false)
    } catch (err: unknown) {
      // KROK 4: Błąd — rollback przez rewalidację (fetch świeżych danych)
      await mutate(pipelineSWRKey) // bez optymistycznych danych = rollback
      const message = err instanceof Error ? err.message : String(err)
      setError(`Nie można wystartować story: ${message}`)
      setLoading(false)
    }
  }, [pipelineSWRKey])

  /**
   * Przesuwa story do podanego statusu.
   * Wywołuje POST /api/stories/{id}/advance z optimistic update.
   *
   * @param id     - Identyfikator story, np. "STORY-1.3"
   * @param status - Nowy status, np. "REVIEW", "DONE"
   */
  const advanceStory = useCallback(async (id: string, status: string): Promise<void> => {
    setLoading(true)
    setError(null)

    // KROK 1: Optimistic update
    await mutate<PipelineResponse | null>(
      pipelineSWRKey,
      (current: PipelineResponse | null | undefined) => {
        if (!current) return current
        return {
          ...current,
          stories: current.stories.map(s =>
            s.story_id === id ? { ...s, status: status as PipelineResponse['stories'][number]['status'] } : s
          ),
        }
      },
      false
    )

    try {
      // KROK 2: Wyślij request
      const response = await apiFetch(`/api/stories/${id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      // KROK 2a: Obsłuż tryb queued — pokaż toast gdy komenda w kolejce
      const data = await response.json().catch(() => ({})) as Record<string, unknown>
      if (data['mode'] === 'queued') {
        toast(data['message'] as string ?? 'Komenda w kolejce — Bridge przetworzy w ciągu minuty', {
          duration: 6000,
          style: {
            background: '#1a2a3a',
            border: '1px solid #1e3a6e',
            color: '#93c5fd',
          },
        })
      }

      // KROK 3: Potwierdź z serwera
      await mutate(pipelineSWRKey)
      setLoading(false)
    } catch (err: unknown) {
      // KROK 4: Rollback
      await mutate(pipelineSWRKey)
      const message = err instanceof Error ? err.message : String(err)
      setError(`Nie można przesunąć story do ${status}: ${message}`)
      setLoading(false)
    }
  }, [pipelineSWRKey])

  return { startStory, advanceStory, loading, error }
}
