'use client'

// hooks/useHealth.ts
// Hook pobierający status zdrowia systemu z 3 endpointów Bridge API.
// Endpointy: GET /api/health, /api/health/memu, /api/health/db
// Auto-refresh co 60 sekund. Używa Promise.allSettled dla odporności na częściowe awarie.

import { useState, useEffect, useRef, useCallback } from 'react'
import { BRIDGE_URL } from '@/lib/bridge'
import type { HealthData, RawHealthResponse, RawMemuResponse, RawDbResponse } from '@/types/insights'

/** Interwał auto-refresh w ms. */
const REFRESH_INTERVAL_MS = 60_000

/** Timeout pojedynczego żądania w ms. */
const TIMEOUT_MS = 5000

interface UseHealthReturn {
  /** Dane zdrowia systemu lub null gdy ładowanie / offline. */
  data: HealthData | null
  /** true podczas pierwszego ładowania. */
  loading: boolean
  /** true gdy wszystkie endpointy są niedostępne. */
  offline: boolean
}

/** Wykonuje fetch z timeoutem. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Bezpieczny JSON fetch — zwraca null zamiast rzucać. */
async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Pobiera dane zdrowia systemu z 3 endpointów równolegle (Promise.allSettled).
 * Auto-refresh co 60 sekund. Interval czyszczony przy unmount (brak memory leaks).
 *
 * Przykład użycia:
 *   const { data, loading, offline } = useHealth()
 */
export function useHealth(): UseHealthReturn {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchHealth = useCallback(async () => {
    // Używamy Promise.allSettled żeby jeden niedostępny endpoint nie blokował pozostałych (EC-1)
    const [healthResult, memuResult, dbResult] = await Promise.allSettled([
      safeFetch<RawHealthResponse>(`${BRIDGE_URL}/api/status/health`),
      safeFetch<RawMemuResponse>(`${BRIDGE_URL}/api/health/memu`),
      safeFetch<RawDbResponse>(`${BRIDGE_URL}/api/health/db`),
    ])

    if (!mountedRef.current) return

    const health = healthResult.status === 'fulfilled' ? healthResult.value : null
    const memu = memuResult.status === 'fulfilled' ? memuResult.value : null
    const db = dbResult.status === 'fulfilled' ? dbResult.value : null

    // Jeśli wszystkie niedostępne → offline
    const allFailed = health === null && memu === null && db === null
    setOffline(allFailed)

    const merged: HealthData = {
      bridge: {
        status: health?.bridge_status ?? (health !== null ? 'UP' : 'DOWN'),
        ping_ms: health?.ping_ms,
      },
      memu: {
        status: memu?.status ?? 'DOWN',
      },
      db_size_mb: db?.size_mb ?? 0,
      last_run: health?.last_run ?? '',
      alerts: health?.alerts ?? [],
    }

    // eslint-disable-next-line -- setData in callback, not synchronous effect render
    setData(merged)
    // eslint-disable-next-line -- setLoading in callback, not synchronous effect render
    setLoading(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // Pierwsze pobranie
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchHealth is a data fetch, not a cascading render
    void fetchHealth()

    // Auto-refresh co 60s
    intervalRef.current = setInterval(() => {
      void fetchHealth()
    }, REFRESH_INTERVAL_MS)

    return () => {
      // Cleanup przy unmount — brak memory leaks (EC-4)
      mountedRef.current = false
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchHealth])

  return { data, loading, offline }
}
