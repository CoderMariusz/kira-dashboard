'use client'

// hooks/useLivePipeline.ts
// Hook łączący usePipeline() z live updates via useSSE() i optimistic UI.
// Implementuje STORY-2.7 — zarządza lokalnym state stories bez refetch przy SSE eventach.

import { useState, useEffect, useCallback, useRef } from 'react'
import { mutate } from 'swr'
import { usePipeline } from './usePipeline'
import { useSSE } from './useSSE'
import { apiFetch } from '@/lib/api'
import type { Story, StoryStatus } from '@/types/bridge'
import type { StoryAdvancedPayload } from '@/types/sse.types'

/** Klucz SWR pipeline — musi pasować do usePipeline */
const PIPELINE_SWR_KEY = '/api/status/pipeline'

/** Opóźnienie fallback refreshu gdy SSE offline (ms) */
const SSE_OFFLINE_REFRESH_DELAY_MS = 5000

/**
 * Rozszerzony typ Story z polami wewnętrznymi dla live updates i optimistic UI.
 * Pola z _ są wewnętrzne — nie powinny być przekazywane do persystencji.
 */
export interface LiveStory extends Story {
  /** true przez 600ms po SSE update — powoduje flash highlight w UI */
  _justUpdated?: boolean
  /** true gdy oczekujemy na potwierdzenie z serwera (optimistic update) */
  _isOptimistic?: boolean
}

export interface UseLivePipelineReturn {
  /** Lista stories z live updates. null gdy ładowanie lub offline. */
  stories: LiveStory[] | null
  /** true gdy pierwsze ładowanie */
  loading: boolean
  /** true gdy Bridge API offline */
  offline: boolean
  /** true gdy SSE jest połączone */
  sseConnected: boolean
  /** Opis błędu SSE lub null */
  sseError: string | null
  /** Uruchamia story z optimistic update i rollback przy błędzie */
  startStory: (storyId: string) => Promise<void>
}

/**
 * Hook zarządzający live pipeline z SSE updates i optimistic UI.
 *
 * Strategia:
 * 1. Pobiera dane z usePipeline() (SWR) jako bazowy stan
 * 2. Nasłuchuje SSE eventów przez useSSE() — aktualizuje lokalny state BEZ refetch
 * 3. startStory() — optimistic update natychmiastowy + rollback przy błędzie API
 * 4. Gdy SSE offline > 5s — fallback do SWR revalidate co 5s
 *
 * AC-6: SSE event story_advanced aktualizuje listę bez fetch do API
 * AC-7: Optimistic UI dla startStory z rollback
 * EC-1: Fallback na polling gdy SSE offline
 * EC-5: Nieznane story_id w SSE event — brak akcji (map nie znajduje, zwraca bez zmian)
 */
export function useLivePipeline(): UseLivePipelineReturn {
  const { stories: baseStories, loading, offline } = usePipeline()
  const { events, connected: sseConnected, error: sseError } = useSSE('/api/events')

  // Lokalny state stories — kopia baseStories z nałożonymi live updates
  const [localStories, setLocalStories] = useState<LiveStory[] | null>(null)

  // Ref do śledzenia czy są aktywne optymistyczne updates (zapobiega nadpisaniu przez SWR)
  const optimisticIdsRef = useRef<Set<string>>(new Set())

  // Synchronizuj lokalny state z SWR data przy pierwszym załadowaniu i po refresh
  // Nie nadpisuj stories które mają aktywny optimistic update
  useEffect(() => {
    if (baseStories) {
      setLocalStories((prev) => {
        if (!prev) {
          // Pierwsze ładowanie — użyj danych z SWR bezpośrednio
          return baseStories as LiveStory[]
        }

        // Merge: zachowaj flagi _justUpdated i _isOptimistic dla istniejących stories
        return baseStories.map((basStory) => {
          const local = prev.find((l) => l.id === basStory.id)

          // Jeśli story ma aktywny optimistic update — zachowaj lokalny stan
          if (local && optimisticIdsRef.current.has(basStory.id)) {
            return local
          }

          // W przeciwnym razie użyj świeżych danych z SWR, zachowując tylko _justUpdated
          return {
            ...basStory,
            _justUpdated: local?._justUpdated ?? false,
          } as LiveStory
        })
      })
    }
  }, [baseStories])

  // Obsługa eventów SSE — aktualizuj stories BEZ refetch (AC-6)
  const processedEventKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!events || events.length === 0) return

    // events[0] = najnowszy event (useSSE daje [latest, ...rest])
    const latestEvent = events[0]
    if (!latestEvent) return

    // Deduplikacja — każdy event (per ts) przetwarzamy tylko raz
    const eventKey = String(latestEvent.ts)
    if (processedEventKeysRef.current.has(eventKey)) return
    processedEventKeysRef.current.add(eventKey)

    // Czyść starsze klucze żeby Set nie urósł bez końca
    if (processedEventKeysRef.current.size > 200) {
      const keys = Array.from(processedEventKeysRef.current)
      keys.slice(0, 100).forEach((k) => processedEventKeysRef.current.delete(k))
    }

    // Obsługa story_advanced i story_started
    if (latestEvent.type === 'story_advanced') {
      const payload = latestEvent.payload as StoryAdvancedPayload
      const { storyId, newStatus } = payload

      if (!storyId || !newStatus) return

      // EC-5: Nieznany storyId — map nie znajdzie, zwróci tablicę bez zmian
      setLocalStories((prev) => {
        if (!prev) return prev
        return prev.map((s) =>
          s.id === storyId
            ? { ...s, status: newStatus as StoryStatus, _justUpdated: true }
            : s
        )
      })

      // Usuń flash highlight po 600ms (koniec animacji, AC-6)
      setTimeout(() => {
        setLocalStories((prev) => {
          if (!prev) return prev
          return prev.map((s) =>
            s.id === storyId ? { ...s, _justUpdated: false } : s
          )
        })
      }, 600)
    }
  }, [events])

  // EC-1: Fallback polling gdy SSE offline — refresh co 5s przez SWR mutate
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!sseConnected) {
      // SSE offline — uruchom fallback polling po 5s opóźnieniu
      const startTimer = setTimeout(() => {
        fallbackTimerRef.current = setInterval(() => {
          void mutate(PIPELINE_SWR_KEY)
        }, SSE_OFFLINE_REFRESH_DELAY_MS)
      }, SSE_OFFLINE_REFRESH_DELAY_MS)

      return () => {
        clearTimeout(startTimer)
        if (fallbackTimerRef.current) {
          clearInterval(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }
      }
    } else {
      // SSE połączone — zatrzymaj fallback polling
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
      return undefined
    }
  }, [sseConnected])

  /**
   * Uruchamia story z optimistic UI i rollback przy błędzie.
   * AC-7: Natychmiastowa zmiana statusu na IN_PROGRESS przed wysłaniem HTTP
   */
  const startStory = useCallback(
    async (storyId: string): Promise<void> => {
      // Znajdź oryginalną story do rollback
      const originalStory = localStories?.find((s) => s.id === storyId)
      if (!originalStory) return

      // Oznacz jako aktywny optimistic update
      optimisticIdsRef.current.add(storyId)

      // KROK 1: Optimistic update — natychmiastowa zmiana stanu (< 50ms)
      setLocalStories((prev) =>
        prev?.map((s) =>
          s.id === storyId
            ? { ...s, status: 'IN_PROGRESS', _isOptimistic: true }
            : s
        ) ?? prev
      )

      try {
        // KROK 2: Wyślij request do serwera
        await apiFetch(`/api/stories/${storyId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        // KROK 3: Sukces — usuń flagę optimistic
        setLocalStories((prev) =>
          prev?.map((s) =>
            s.id === storyId ? { ...s, _isOptimistic: false } : s
          ) ?? prev
        )
        optimisticIdsRef.current.delete(storyId)

        // Rewaliduj SWR żeby potwierdzić stan z serwera (w tle)
        void mutate(PIPELINE_SWR_KEY)
      } catch (err) {
        // KROK 4: Błąd — rollback do oryginalnego stanu (AC-7)
        setLocalStories((prev) =>
          prev?.map((s) =>
            s.id === storyId ? { ...originalStory, _isOptimistic: false } : s
          ) ?? prev
        )
        optimisticIdsRef.current.delete(storyId)

        // Propaguj błąd do UI (toast w komponencie wywołującym)
        throw err
      }
    },
    [localStories]
  )

  return {
    stories: localStories,
    loading,
    offline,
    sseConnected,
    sseError,
    startStory,
  }
}
