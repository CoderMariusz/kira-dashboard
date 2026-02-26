'use client'

// hooks/useSSE.ts
// Hook zarządzający EventSource (SSE) z auto-reconnect i fallback na polling.
// Implementuje STORY-2.4.

import { useEffect, useRef, useState, useCallback } from 'react'
import { mutate } from 'swr'
import type { SSEEvent, UseSSEReturn } from '@/types/sse.types'

/** Klucz SWR używany przez usePipeline — musi pasować dokładnie */
const PIPELINE_SWR_KEY = '/api/status/pipeline'

/** Maksymalna liczba przechowywanych eventów w stanie */
const MAX_EVENTS = 100

/** Delay przed próbą reconnect (ms) */
const RECONNECT_DELAY_MS = 3000

/** Maksymalna liczba prób reconnect przed zatrzymaniem */
const MAX_RECONNECT_ATTEMPTS = 10

/** Interwał pollingu fallback (ms) */
const POLLING_INTERVAL_MS = 30_000

/** Liczba kolejnych błędów SSE przed przełączeniem na polling */
const FALLBACK_ERROR_THRESHOLD = 4

/**
 * Hook zarządzający połączeniem SSE (EventSource) z auto-reconnect.
 *
 * Funkcje:
 * - Odbiera eventy SSE z podanego URL i utrzymuje `events: SSEEvent[]`
 * - Auto-reconnect po 3s przy błędzie (max 10 prób)
 * - Fallback na polling SWR co 30s po 3 kolejnych błędach
 * - Cleanup EventSource i timerów przy unmount
 * - Obsługa SSR (brak window.EventSource w środowisku serwerowym)
 *
 * @param url - URL endpoint SSE, np. '/api/events'
 * @returns UseSSEReturn
 */
export function useSSE(url: string): UseSSEReturn {
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Refy do przechowywania mutowalnych wartości między renderami
  const esRef = useRef<EventSource | null>(null) // aktywny EventSource
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0) // synchroniczna kopia reconnectAttempts
  const consecutiveErrorsRef = useRef(0) // licznik kolejnych błędów bez sukcesu
  const isMountedRef = useRef(true) // czy komponent jest zamontowany

  /** Uruchom polling fallback przez SWR mutate */
  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return // już działa
    pollingIntervalRef.current = setInterval(() => {
      void mutate(PIPELINE_SWR_KEY)
    }, POLLING_INTERVAL_MS)
  }, [])

  /** Zatrzymaj polling fallback */
  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  /** Główna funkcja tworząca EventSource */
  const connectSSE = useCallback(() => {
    // EC-1: Sprawdź czy EventSource jest dostępne (brak w środowisku SSR)
    if (typeof EventSource === 'undefined') {
      setError('SSE niedostępne w tym środowisku')
      startPollingFallback()
      return
    }

    // Zamknij poprzedni EventSource jeśli istnieje
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (event: MessageEvent) => {
      if (!isMountedRef.current) return
      try {
        const parsed = JSON.parse(event.data as string) as SSEEvent
        // Zresetuj licznik błędów po sukcesie
        consecutiveErrorsRef.current = 0
        attemptsRef.current = 0

        setConnected(true)
        setError(null)
        setReconnectAttempts(0)
        setEvents(prev => [parsed, ...prev].slice(0, MAX_EVENTS))
      } catch {
        // Niewalidny JSON — ignoruj cicho (nie crashuj)
        console.warn('[useSSE] Niewalidny JSON w evencie SSE:', event.data)
      }
    }

    es.onerror = () => {
      if (!isMountedRef.current) return

      setConnected(false)
      consecutiveErrorsRef.current += 1

      // Sprawdź czy przejść na polling (po 3+ kolejnych błędach)
      if (consecutiveErrorsRef.current >= FALLBACK_ERROR_THRESHOLD) {
        setError('SSE niedostępne — tryb polling (co 30s)')
        startPollingFallback()
      }

      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptsRef.current += 1
        setReconnectAttempts(attemptsRef.current)

        // Ustaw komunikat błędu (polling lub reconnect)
        if (consecutiveErrorsRef.current < FALLBACK_ERROR_THRESHOLD) {
          setError(
            `Reconnecting... (${attemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          )
        }

        // Zaplanuj reconnect po RECONNECT_DELAY_MS
        reconnectTimerRef.current = setTimeout(() => {
          // eslint-disable-next-line -- connectSSE is defined via useCallback earlier in scope
          if (isMountedRef.current) connectSSE()
        }, RECONNECT_DELAY_MS)
      } else {
        setError(
          `Max reconnect attempts reached (${MAX_RECONNECT_ATTEMPTS}/${MAX_RECONNECT_ATTEMPTS})`
        )
      }
    }

    es.addEventListener('open', () => {
      if (!isMountedRef.current) return
      setConnected(true)
      consecutiveErrorsRef.current = 0
      stopPollingFallback() // SSE działa — wyłącz polling
    })
  }, [url, startPollingFallback, stopPollingFallback])

  useEffect(() => {
    isMountedRef.current = true
    connectSSE()

    return () => {
      // Cleanup przy unmount
      isMountedRef.current = false

      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      stopPollingFallback()
    }
  }, [connectSSE, stopPollingFallback])

  return { events, connected, error, reconnectAttempts }
}
