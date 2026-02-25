/**
 * __tests__/hooks/useNightClawSkillsDiff.test.tsx
 * STORY-9.5 — Unit tests for useNightClawSkillsDiff hook
 *
 * Test matrix:
 *  TC-1  isLoading=true initially
 *  TC-2  returns data on success
 *  TC-3  returns error on 401
 *  TC-4  returns error on network failure
 *  TC-5  exposes refresh function
 */

import { jest } from '@jest/globals'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

const mockFetch = jest.fn<Promise<Response>, [string]>()
global.fetch = mockFetch as typeof fetch

import { useNightClawSkillsDiff } from '@/hooks/useNightClawSkillsDiff'
import type { SkillsDiffResponse } from '@/types/nightclaw'

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    )
  }
}

const MOCK_SKILLS_DIFF: SkillsDiffResponse = {
  skills: [
    {
      name: 'kira-implementor',
      path: '/skills/kira-implementor/SKILL.md',
      diff: '@@ -1,3 +1,5 @@\n+new line\n context',
      lines_added: 2,
      lines_removed: 1,
      modified_at: '2026-02-25T01:30:00Z',
    },
  ],
  total_modified: 1,
}

describe('useNightClawSkillsDiff', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('TC-1: isLoading=true initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useNightClawSkillsDiff(), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('TC-2: returns data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SKILLS_DIFF,
    } as Response)

    const { result } = renderHook(() => useNightClawSkillsDiff(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(MOCK_SKILLS_DIFF)
    expect(result.current.error).toBeUndefined()
    expect(mockFetch).toHaveBeenCalledWith('/api/nightclaw/skills-diff')
  })

  it('TC-3: returns error on 401', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 } as Response)

    const { result } = renderHook(() => useNightClawSkillsDiff(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error?.message).toBe(
      'Sesja wygasła — zaloguj się ponownie'
    )
  })

  it('TC-4: returns error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))

    const { result } = renderHook(() => useNightClawSkillsDiff(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error?.message).toBe('Brak połączenia z serwerem')
  })

  it('TC-5: exposes refresh function', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SKILLS_DIFF,
    } as Response)

    const { result } = renderHook(() => useNightClawSkillsDiff(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(typeof result.current.refresh).toBe('function')
  })
})
