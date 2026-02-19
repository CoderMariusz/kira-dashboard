'use client'

import { useEffect, useRef } from 'react'
import { useSSE } from '@/hooks/useSSE'
import {
  toastStoryAdvanced,
  toastEvalDone,
  toastError,
} from '@/lib/toast'
import type {
  SSEEvent,
  StoryAdvancedPayload,
  EvalDonePayload,
} from '@/types/sse.types'

// Komponent Client-side który nasłuchuje SSE i wywołuje toasty
// Renderuje null — nie ma własnego UI
export function SSEProvider() {
  const { events, error } = useSSE('/api/events')
  const lastTsRef = useRef<number>(0)  // ts ostatnio przetworzonego eventu

  // Reaguj na nowe eventy SSE
  useEffect(() => {
    const latest = events[0]  // najnowszy event jest zawsze na pozycji [0]
    if (!latest) return

    // Sprawdź czy to nowy event (nie przetworzony wcześniej)
    if (latest.ts <= lastTsRef.current) return
    lastTsRef.current = latest.ts

    // Wywołaj odpowiednią funkcję toast na podstawie typu eventu
    switch (latest.type) {
      case 'story_advanced': {
        const p = latest.payload as StoryAdvancedPayload
        toastStoryAdvanced(
          { id: p.storyId, title: p.storyId },  // tytuł pobierany z cache jeśli dostępny
          p.newStatus
        )
        break
      }
      case 'eval_done': {
        const p = latest.payload as EvalDonePayload
        toastEvalDone(p)
        break
      }
      case 'heartbeat':
        // Heartbeat — brak toastu, cichy
        break
      default:
        // Nieznany typ — ignoruj
        break
    }
  }, [events])  // deps: cała tablica events — uruchom gdy events się zmieni

  // Wyświetl toast błędu gdy SSE jest niedostępne (ale nie przy każdym re-renderze)
  const lastErrorRef = useRef<string | null>(null)
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error
      // Nie pokazuj toastu dla "Reconnecting..." — tylko dla finalnych błędów
      if (error.includes('niedostępne') || error.includes('Max reconnect')) {
        toastError(error)
      }
    }
    if (!error) {
      lastErrorRef.current = null
    }
  }, [error])

  return null  // Ten komponent nie renderuje żadnego UI
}
