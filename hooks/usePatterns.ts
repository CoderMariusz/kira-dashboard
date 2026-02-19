'use client'

// hooks/usePatterns.ts
// Hook pobierający top 5 potwierdzonych wzorców z Bridge API.
// Endpoint: GET /api/patterns?limit=5&status=confirmed

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { Pattern, PatternsResponse } from '@/types/insights'

interface UsePatternsReturn {
  /** Lista top 5 wzorców lub null gdy ładowanie / offline. */
  patterns: Pattern[] | null
  /** true podczas pierwszego ładowania. */
  loading: boolean
  /** true gdy Bridge jest niedostępny lub wystąpił błąd. */
  offline: boolean
}

/**
 * Pobiera top 5 potwierdzonych wzorców z Bridge API.
 * Endpoint: GET /api/patterns?limit=5&status=confirmed
 *
 * Przykład użycia:
 *   const { patterns, loading, offline } = usePatterns()
 */
export function usePatterns(): UsePatternsReturn {
  const { data, error, isLoading } = useSWR<PatternsResponse | null>(
    '/api/patterns?limit=5&status=confirmed',
    (path: string) => fetchBridge<PatternsResponse>(path),
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  // fetchBridge zwraca null (nie rzuca) gdy offline → error nigdy nie jest ustawiony.
  // data === null && !isLoading łapie ten przypadek.
  const offline = error !== undefined || (data === null && !isLoading)
  const patterns = data?.patterns ?? null

  return {
    patterns,
    loading: isLoading,
    offline,
  }
}
