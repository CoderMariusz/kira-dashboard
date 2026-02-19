'use client'

// hooks/useStats.ts
// Hook pobierający zagregowane statystyki projektu z Bridge API.
// Używa SWR z pollingiem co 30 sekund.

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { PipelineStats } from '@/types/bridge'

/** Opcje konfiguracyjne dla hooka useStats. */
interface UseStatsOptions {
  /**
   * Interwał pollingu w milisekundach.
   * Domyślnie: 30000 (30 sekund).
   * Ustaw na 0 żeby wyłączyć polling.
   */
  refreshInterval?: number
  /**
   * Klucz projektu używany w ścieżce API, np. "kira-dashboard".
   * Domyślnie: zmienna środowiskowa NEXT_PUBLIC_BRIDGE_PROJECT lub "kira-dashboard".
   */
  projectKey?: string
}

/** Wartości zwracane przez hook useStats. */
interface UseStatsReturn {
  /** Statystyki pipeline'u. null gdy ładowanie lub offline. */
  stats: PipelineStats | null
  /** true gdy pierwsze ładowanie (stats === null i nie offline). */
  loading: boolean
  /** true gdy Bridge API jest niedostępne lub zwróciło błąd. */
  offline: boolean
}

/**
 * Pobiera zagregowane statystyki projektu z Bridge API.
 * Endpoint: GET /api/projects/{projectKey}/stats
 *
 * Przykład użycia:
 *   const { stats, loading, offline } = useStats()
 *   const { stats } = useStats({ refreshInterval: 10000 })       // polling co 10s
 *   const { stats } = useStats({ refreshInterval: 0 })           // bez pollingu
 *   const { stats } = useStats({ projectKey: 'gym-tracker' })    // inny projekt
 */
export function useStats(options: UseStatsOptions = {}): UseStatsReturn {
  const {
    refreshInterval = 30000,
    projectKey = process.env.NEXT_PUBLIC_BRIDGE_PROJECT ?? 'kira-dashboard',
  } = options

  const { data, error, isLoading } = useSWR<PipelineStats | null>(
    `/api/projects/${projectKey}/stats`,
    (path: string) => fetchBridge<PipelineStats>(path),
    {
      refreshInterval,
      // Nie rewaliduj przy focusie okna — zbędne dla dashboard
      revalidateOnFocus: false,
      // Nie retry automatycznie przy błędzie — fetchBridge już robi retry
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || (data === null && !isLoading)
  const stats = data ?? null

  return {
    stats,
    loading: isLoading,
    offline,
  }
}
