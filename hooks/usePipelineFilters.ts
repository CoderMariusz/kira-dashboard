'use client'

// hooks/usePipelineFilters.ts
// Hook zarządzający stanem filtrów pipeline i synchronizujący je z URL query params.
// Implementuje STORY-2.7.

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Dozwolone wartości statusów (pusta string = "wszystkie") */
export const VALID_STATUSES = ['', 'IN_PROGRESS', 'REVIEW', 'REFACTOR', 'DONE', 'MERGE', 'BLOCKED'] as const

/**
 * Stan filtrów pipeline.
 * Puste string oznacza "brak filtra" (pokaż wszystkie).
 */
export interface PipelineFilters {
  /** '' = wszystkie statusy, lub konkretny status */
  status: string
  /** '' = wszystkie modele, lub konkretny model (assigned_model) */
  model: string
  /** '' = wszystkie projekty, lub konkretny klucz projektu */
  project: string
  /** '' = brak frazy, lub fraza do wyszukania po ID/tytule */
  search: string
}

export interface UsePipelineFiltersReturn {
  filters: PipelineFilters
  setFilters: (newFilters: Partial<PipelineFilters>) => void
  resetFilters: () => void
}

/**
 * Waliduje wartość statusu z URL — zwraca '' jeśli nieprawidłowa.
 * EC-3: ciche ignorowanie nieprawidłowych wartości.
 */
function validateStatus(value: string | null): string {
  if (!value) return ''
  return (VALID_STATUSES as readonly string[]).includes(value) ? value : ''
}

/**
 * Hook do zarządzania filtrami pipeline z synchronizacją URL.
 *
 * Filtry są inicjalizowane z URL query params przy pierwszym renderze.
 * Każda zmiana filtru aktualizuje URL (router.push) bez przeładowania strony.
 * Reset filtrów usuwa wszystkie filter params z URL.
 */
export function usePipelineFilters(): UsePipelineFiltersReturn {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Inicjalizacja ze zwalidowanych URL query params (AC-5, EC-3)
  const [filters, setFiltersState] = useState<PipelineFilters>({
    status: validateStatus(searchParams.get('status')),
    model: searchParams.get('model') ?? '',
    project: searchParams.get('project') ?? '',
    search: searchParams.get('search') ?? '',
  })

  /**
   * Aktualizuje podane filtry i synchronizuje URL.
   * Niezdefiniowane klucze w newFilters są zachowane bez zmian.
   */
  // Ref do śledzenia czy zmiana filtrów pochodzi od usera (nie z URL init)
  const isUserChange = useRef(false)

  // Synchronizuj URL gdy filtry się zmieniają — useEffect zamiast router.push
  // wewnątrz setState (które powoduje "Cannot update while rendering" błąd React)
  useEffect(() => {
    if (!isUserChange.current) return
    isUserChange.current = false

    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'pipeline')

    if (filters.status) params.set('status', filters.status)
    else params.delete('status')

    if (filters.model) params.set('model', filters.model)
    else params.delete('model')

    if (filters.project) params.set('project', filters.project)
    else params.delete('project')

    if (filters.search) params.set('search', filters.search)
    else params.delete('search')

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [filters, searchParams, router, pathname])

  const setFilters = useCallback(
    (newFilters: Partial<PipelineFilters>) => {
      isUserChange.current = true
      setFiltersState((prev) => ({ ...prev, ...newFilters }))
    },
    []
  )

  /**
   * Resetuje wszystkie filtry do wartości domyślnych i czyści URL params.
   * AC-8: kliknięcie "Resetuj filtry" czyści filtry i URL.
   */
  const resetFilters = useCallback(() => {
    setFilters({ status: '', model: '', project: '', search: '' })
  }, [setFilters])

  return { filters, setFilters, resetFilters }
}
