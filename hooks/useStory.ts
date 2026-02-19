'use client'

// hooks/useStory.ts
// SWR hook do pobierania danych jednej story z GET /api/stories/[id].
// Implementacja STORY-2.6.

import useSWR, { mutate } from 'swr'
import type { Story } from '@/types/story.types'

interface FetchError extends Error {
  status?: number
}

const storyFetcher = async (url: string): Promise<Story> => {
  const res = await fetch(url)
  if (!res.ok) {
    const err: FetchError = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json() as Promise<Story>
}

export function useStory(id: string) {
  const key = `/api/stories/${id}`
  const { data, error, isLoading } = useSWR<Story, FetchError>(key, storyFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 10_000,
  })

  const isNotFound = (error as FetchError | null)?.status === 404
  const isOffline = Boolean(error) && !isNotFound

  return {
    story: data,
    isLoading,
    error,
    isNotFound,
    isOffline,
    refresh: () => mutate(key),
  }
}
