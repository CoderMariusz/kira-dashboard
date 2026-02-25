'use client'

// hooks/useAddLesson.ts
// STORY-8.3 — Mutation hook for POST /api/lessons
// Sends POST and invalidates the SWR /api/patterns cache on success
// (lessons are returned inside PatternsResponse).

import { useState } from 'react'
import { mutate } from 'swr'
import { addLesson as addLessonService } from '@/services/patterns.service'
import { NETWORK_ERROR_MESSAGE } from '@/services/patterns.errors'
import type { AddLessonDTO, ApiError } from '@/types/patterns'

const SWR_KEY_PATTERNS = '/api/patterns'

interface UseAddLessonReturn {
  addLesson: (dto: AddLessonDTO) => Promise<{ success: true } | null>
  isLoading: boolean
  error:     ApiError | null
}

export function useAddLesson(): UseAddLessonReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<ApiError | null>(null)

  async function addLesson(dto: AddLessonDTO): Promise<{ success: true } | null> {
    setIsLoading(true)
    setError(null)

    try {
      const result = await addLessonService(dto)
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

  return { addLesson, isLoading, error }
}
