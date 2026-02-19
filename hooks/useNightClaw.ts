'use client'

// hooks/useNightClaw.ts
// Hook pobierający dane najnowszego raportu NightClaw z Bridge API.
// Endpoint: GET /api/nightclaw/latest
// Zwraca null gdy brak raportu (404) lub Bridge offline.

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { NightClawData } from '@/types/insights'

interface UseNightClawReturn {
  /** Dane raportu NightClaw lub null gdy brak raportu / offline. */
  data: NightClawData | null
  /** true podczas pierwszego ładowania. */
  loading: boolean
  /** true gdy Bridge jest niedostępny lub wystąpił błąd. */
  offline: boolean
  /** true gdy Bridge zwrócił 404 (brak raportu dziś, ale nie błąd). */
  noDigest: boolean
}

/**
 * Pobiera dane raportu NightClaw z Bridge API.
 * Endpoint: GET /api/nightclaw/latest
 *
 * Stany:
 *  - loading: pierwsze ładowanie
 *  - noDigest: brak raportu dziś (404 lub null z API)
 *  - offline: błąd sieciowy / Bridge niedostępny
 *  - data != null: dane załadowane poprawnie
 */
export function useNightClaw(): UseNightClawReturn {
  const { data, error, isLoading } = useSWR<NightClawData | null>(
    '/api/nightclaw/latest',
    (path: string) => fetchBridge<NightClawData>(path),
    {
      // Brak auto-refresh — raport generowany raz dziennie o 2:00 AM
      refreshInterval: 0,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // fetchBridge zwraca null (nie rzuca) gdy offline → error nigdy nie jest ustawiony.
  // data === null && !isLoading łapie ten przypadek.
  const offline = error !== undefined || (data === null && !isLoading)
  // noDigest: Bridge online, dane zwrócone, ale brak digest (NightClaw nie wygenerował dziś raportu).
  // Trójstanowa logika: offline → noDigest → data z digestem.
  const noDigest = !offline && data != null && !data.digest

  return {
    data: data ?? null,
    loading: isLoading,
    offline,
    noDigest,
  }
}
