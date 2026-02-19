'use client'

// hooks/usePipelineFilters.ts
// Hook zarządzający stanem filtrów pipeline i synchronizujący je z URL query params.
// Implementuje STORY-2.7.

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'

/** Dozwolone wartości statusów (pusta string = "wszystkie") */
const VALID_STATUSES = ['', 'IN_PROGRESS', 'REVIEW', 'REFACTOR', 'DONE', 'MERGE', 'BLOCKED'] as const

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
  const setFilters = useCallback(
    (newFilters: Partial<PipelineFilters>) => {
      setFiltersState((prev) => {
        const updated: PipelineFilters = { ...prev, ...newFilters }

        // Buduj nowe URL params zachowując istniejące (np. ?tab=pipeline)
        const params = new URLSearchParams(searchParams.toString())

        // Upewnij się, że tab=pipeline jest zachowane
        params.set('tab', 'pipeline')

        // Ustaw lub usuń każdy filtr
        if (updated.status) {
          params.set('status', updated.status)
        } else {
          params.delete('status')
        }

        if (updated.model) {
          params.set('model', updated.model)
        } else {
          params.delete('model')
        }

        if (updated.project) {
          params.set('project', updated.project)
        } else {
          params.delete('project')
        }

        if (updated.search) {
          params.set('search', updated.search)
        } else {
          params.delete('search')
        }

        // Aktualizuj URL bez przeładowania strony (AC-3)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })

        return updated
      })
    },
    [searchParams, router, pathname]
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
