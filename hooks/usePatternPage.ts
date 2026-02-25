'use client'

// hooks/usePatternPage.ts
// STORY-8.3 — SWR hook for GET /api/patterns
// Replaces the stub in usePatterns.ts (which returned nulls).

import useSWR from 'swr'
import { getPatterns } from '@/services/patterns.service'
import { NETWORK_ERROR_MESSAGE } from '@/services/patterns.errors'
import type { PatternCard, Lesson, PatternsMeta, ApiError } from '@/types/patterns'

const SWR_KEY_PATTERNS = '/api/patterns'

interface UsePatternPageReturn {
  patterns:  PatternCard[] | null
  lessons:   Lesson[] | null
  meta:      PatternsMeta | null
  isLoading: boolean
  error:     ApiError | null
  refresh:   () => Promise<void>
}

function normaliseError(err: unknown): ApiError {
  if (err instanceof Error) {
    return { statusCode: 0, message: err.message }
  }
  return { statusCode: 0, message: NETWORK_ERROR_MESSAGE }
}

export function usePatternPage(): UsePatternPageReturn {
  const { data, error, isLoading, mutate } = useSWR(
    SWR_KEY_PATTERNS,
    () => getPatterns(),
    {
      refreshInterval:    60_000,
      revalidateOnFocus:  false,
      shouldRetryOnError: false,
    }
  )

  const normalisedError: ApiError | null = error != null
    ? normaliseError(error)
    : null

  async function refresh(): Promise<void> {
    await mutate()
  }

  if (!data) {
    return {
      patterns:  null,
      lessons:   null,
      meta:      null,
      isLoading,
      error:     normalisedError,
      refresh,
    }
  }

  return {
    patterns:  data.patterns,
    lessons:   data.lessons,
    meta:      data.meta,
    isLoading,
    error:     null,
    refresh,
  }
}
