'use client'
// hooks/useModels.ts
// SWR hook for the model list — GET /api/models (STORY-5.4).
// Polls every 60s. Returns { models, isLoading, error, mutate }.
import useSWR, { type KeyedMutator } from 'swr'
import type { ModelEntry } from '@/types/models'

// Human-readable error messages keyed by HTTP status code.
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Nieprawidłowe żądanie',
  401: 'Brak dostępu — zaloguj się ponownie',
  403: 'Brak uprawnień',
  404: 'Nie znaleziono danych',
  500: 'Błąd serwera — spróbuj ponownie',
}

async function fetchModels(url: string): Promise<ModelEntry[]> {
  const res = await fetch(url)
  if (!res.ok) {
    const message = ERROR_MESSAGES[res.status] ?? `Błąd ${res.status}`
    throw new Error(message)
  }
  // API wraps response in { data: ModelEntry[] } — unwrap here.
  const json = (await res.json()) as { data: ModelEntry[] }
  return json.data
}

export interface UseModelsResult {
  models: ModelEntry[]
  isLoading: boolean
  error: Error | undefined
  mutate: KeyedMutator<ModelEntry[]>
}

/**
 * Hook returning the list of all AI models with live stats.
 * Automatically re-fetches every 60 seconds.
 *
 * @example
 * const { models, isLoading, error } = useModels()
 * if (isLoading) return <Spinner />
 * if (error) return <ErrorBanner message={error.message} />
 * return <ModelList models={models} />
 */
export function useModels(): UseModelsResult {
  const { data, isLoading, error, mutate } = useSWR<ModelEntry[], Error>(
    '/api/models',
    fetchModels,
    {
      refreshInterval: 60_000,  // 60s polling — AC-3
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    }
  )

  return {
    models: data ?? [],   // never undefined — safe default
    isLoading,
    error,
    mutate,
  }
}
