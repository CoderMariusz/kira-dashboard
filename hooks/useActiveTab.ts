'use client'

// hooks/useActiveTab.ts
// Hook który czyta i zapisuje aktywną zakładkę z URL search param ?tab=
// Używa Next.js useSearchParams() i useRouter()

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

/** Dozwolone wartości dla parametru ?tab= */
export type TabValue = 'overview' | 'pipeline' | 'models' | 'epics' | 'eval' | 'patterns' | 'insights'

/** Domyślna zakładka gdy ?tab= nie jest ustawiony w URL. */
const DEFAULT_TAB: TabValue = 'overview'

/** Lista wszystkich dozwolonych zakładek. */
export const ALL_TABS: TabValue[] = ['overview', 'pipeline', 'models', 'epics', 'eval', 'patterns', 'insights']

/** Etykiety dla każdej zakładki — do wyświetlenia w UI. */
export const TAB_LABELS: Record<TabValue, string> = {
  overview: 'Overview',
  pipeline: 'Pipeline',
  models: 'Models',
  epics: 'Epics',
  eval: 'Eval',
  patterns: 'Patterns',
  insights: 'NightClaw 🌙',
}

interface UseActiveTabReturn {
  /** Aktualnie aktywna zakładka (z URL lub domyślna 'overview'). */
  activeTab: TabValue
  /** Funkcja do zmiany aktywnej zakładki — aktualizuje URL (client-side navigation). */
  setActiveTab: (tab: TabValue) => void
}

/**
 * Hook do zarządzania aktywną zakładką przez URL parametr ?tab=
 *
 * Przykład użycia:
 *   const { activeTab, setActiveTab } = useActiveTab()
 *   // activeTab === 'overview' (domyślnie gdy brak ?tab=)
 *   setActiveTab('pipeline')
 *   // URL zmienia się na ?tab=pipeline, activeTab === 'pipeline'
 */
export function useActiveTab(): UseActiveTabReturn {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Odczytaj wartość ?tab= z URL
  const tabParam = searchParams.get('tab')

  // Waliduj — jeśli wartość nie jest w ALL_TABS, użyj domyślnej
  const activeTab: TabValue =
    tabParam !== null && (ALL_TABS as string[]).includes(tabParam)
      ? (tabParam as TabValue)
      : DEFAULT_TAB

  /**
   * Zmienia aktywną zakładkę przez aktualizację URL.
   * Używa router.push() dla client-side navigation (bez reload strony).
   * Zachowuje inne search params jeśli istnieją.
   */
  const setActiveTab = useCallback(
    (tab: TabValue) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  return { activeTab, setActiveTab }
}
