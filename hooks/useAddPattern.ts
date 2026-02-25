'use client'

// hooks/useAddPattern.ts
// STORY-8.3 — Mutation hook for POST /api/patterns
// Sends POST and invalidates the SWR /api/patterns cache on success.

import { useState } from 'react'
import { mutate } from 'swr'
import { addPattern as addPatternService } from '@/services/patterns.service'
import { NETWORK_ERROR_MESSAGE } from '@/services/patterns.errors'
import type { AddPatternDTO, ApiError } from '@/types/patterns'

const SWR_KEY_PATTERNS = '/api/patterns'

interface UseAddPatternReturn {
  addPattern: (dto: AddPatternDTO) => Promise<{ success: true; entry: string } | null>
  isLoading:  boolean
  error:      ApiError | null
}

export function useAddPattern(): UseAddPatternReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<ApiError | null>(null)

  async function addPattern(
    dto: AddPatternDTO
  ): Promise<{ success: true; entry: string } | null> {
    setIsLoading(true)
    setError(null)

    try {
      const result = await addPatternService(dto)
      await mutate(SWR_KEY_PATTERNS)
      return result
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : NETWORK_ERROR_MESSAGE
      setError({ statusCode: 0, message })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { addPattern, isLoading, error }
}
