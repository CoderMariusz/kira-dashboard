/**
 * __tests__/hooks/useEpics.test.tsx
 * STORY-12.8 — Unit tests for useEpics hook
 * TDD: written before hook implementation.
 */

import { jest } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import React from 'react'

const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
global.fetch = mockFetch as typeof fetch

import { useEpics } from '@/hooks/useEpics'
import type { EpicWithProgress } from '@/types/api'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_EPICS: EpicWithProgress[] = [
  {
    project_id: 'kira-dashboard',
    id: 'EPIC-1',
    title: 'Epic One',
    file_path: 'epics/EPIC-1.md',
    status: 'DONE',
    total_stories: 10,
    done_stories: 10,
    created_at: '2026-01-01T00:00:00Z',
    synced_at: '2026-02-26T10:00:00Z',
    progress: 100,
  },
  {
    project_id: 'kira-dashboard',
    id: 'EPIC-2',
    title: 'Epic Two',
    file_path: 'epics/EPIC-2.md',
    status: 'IN_PROGRESS',
    total_stories: 8,
    done_stories: 6,
    created_at: '2026-01-02T00:00:00Z',
    synced_at: '2026-02-26T10:00:00Z',
    progress: 75,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0 } },
      children
    )
  }
}

function makeFetchResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response
}

function makeErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error: `HTTP ${status}` }),
    text: async () => JSON.stringify({ error: `HTTP ${status}` }),
  } as Response
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useEpics', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('returns loading=true initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useEpics(), { wrapper: createWrapper() })
    expect(result.current.loading).toBe(true)
    expect(result.current.epics).toBeNull()
  })

  it('returns epics array on success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: MOCK_EPICS }))
    const { result } = renderHook(() => useEpics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.epics).toEqual(MOCK_EPICS)
    expect(result.current.offline).toBe(false)
  })

  it('calls /api/epics with default project', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: MOCK_EPICS }))
    renderHook(() => useEpics(), { wrapper: createWrapper() })
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect((mockFetch.mock.calls[0][0] as string)).toContain('/api/epics?project=kira-dashboard')
  })

  it('calls /api/epics with custom project', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: MOCK_EPICS }))
    renderHook(() => useEpics('my-project'), { wrapper: createWrapper() })
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect((mockFetch.mock.calls[0][0] as string)).toContain('/api/epics?project=my-project')
  })

  it('sets offline=true when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useEpics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.offline).toBe(true)
    expect(result.current.epics).toBeNull()
  })

  it('returns null epics when API returns error status', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(500))
    const { result } = renderHook(() => useEpics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    // Fetcher returns null on non-ok response, SWR treats null data as offline
    expect(result.current.epics).toBeNull()
  })

  it('returns empty array for project with no epics', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))
    const { result } = renderHook(() => useEpics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.epics).toEqual([])
  })
})
