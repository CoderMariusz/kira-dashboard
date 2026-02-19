'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/hooks/home/useHousehold'

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

export interface AnalyticsOverview {
  completedTasks: number
  completedTasksTrend: number
  shoppingBought: number
  shoppingBoughtTrend: number
  mostActiveUser: {
    name: string
    count: number
    trendPercent: number
  } | null
}

export interface ShoppingDataPoint {
  date: string
  label: string
  count: number
}

export interface CompletionDataPoint {
  date: string
  label: string
  percentage: number
}

export interface PriorityDataPoint {
  name: 'HIGH' | 'MEDIUM' | 'LOW'
  value: number
  color: string
}

export interface HeatmapDataPoint {
  date: string
  count: number
  intensity: 0 | 1 | 2 | 3 | 4
}

export interface AnalyticsData {
  overview: AnalyticsOverview
  shopping: ShoppingDataPoint[]
  completion: CompletionDataPoint[]
  priority: PriorityDataPoint[]
  heatmap: HeatmapDataPoint[]
}

interface UseAnalyticsReturn {
  data: AnalyticsData | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

// ──────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────

export function useAnalytics(): UseAnalyticsReturn {
  const { household } = useHousehold()
  const householdId = household?.id
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const fetchData = useCallback(async () => {
    if (!householdId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setIsError(false)

    try {
      const res = await fetch(`/api/home/analytics?household_id=${householdId}`)
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          console.warn(`[useAnalytics] HTTP ${res.status} — brak dostępu lub błąd żądania`)
        }
        setIsError(true)
        return
      }
      const json = (await res.json()) as AnalyticsData
      setData(json)
    } catch (err) {
      console.warn('[useAnalytics] Błąd sieci:', err)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    void fetchData()
  }, [fetchData])

  return { data, isLoading, isError, refetch }
}
