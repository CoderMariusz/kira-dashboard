/**
 * __tests__/hooks/useNightClawDigest.test.tsx
 * STORY-9.5 — Unit tests for useNightClawDigest hook
 *
 * Test matrix:
 *  TC-1  isLoading=true initially
 *  TC-2  returns data on success (no date)
 *  TC-3  returns data on success (with date) — key includes date
 *  TC-4  returns error on 401
 *  TC-5  returns error on 404
 *  TC-6  returns error on network failure
 *  TC-7  exposes refresh function
 */

import { jest } from '@jest/globals'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn<Promise<Response>, [string]>()
global.fetch = mockFetch as typeof fetch

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { useNightClawDigest } from '@/hooks/useNightClawDigest'
import type { DigestResponse } from '@/types/nightclaw'

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    )
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_DIGEST: DigestResponse = {
  date: '2026-02-25',
  markdown: '# Digest',
  summary: {
    new_patterns: 1,
    lessons_extracted: 2,
    anti_patterns_flagged: 0,
    open_issues: 0,
    generated_at: '2026-02-25T02:00:00Z',
  },
  model_stats: null,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useNightClawDigest', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('TC-1: isLoading=true initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useNightClawDigest(), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeUndefined()
  })

  it('TC-2: returns data on success (no date)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DIGEST,
    } as Response)

    const { result } = renderHook(() => useNightClawDigest(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(MOCK_DIGEST)
    expect(result.current.error).toBeUndefined()
  })

  it('TC-3: calls correct URL when date is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DIGEST,
    } as Response)

    const { result } = renderHook(() => useNightClawDigest('2026-02-25'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/nightclaw/digest?date=2026-02-25'
    )
  })

  it('TC-4: returns error on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response)

    const { result } = renderHook(() => useNightClawDigest(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toBe(
      'Sesja wygasła — zaloguj się ponownie'
    )
    expect(result.current.data).toBeUndefined()
  })

  it('TC-5: returns error on 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { result } = renderHook(() => useNightClawDigest('2020-01-01'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error?.message).toBe('Brak danych dla wybranego dnia')
  })

  it('TC-6: returns error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))

    const { result } = renderHook(() => useNightClawDigest(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toBe('Brak połączenia z serwerem')
  })

  it('TC-7: exposes refresh function', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DIGEST,
    } as Response)

    const { result } = renderHook(() => useNightClawDigest(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(typeof result.current.refresh).toBe('function')
  })
})
