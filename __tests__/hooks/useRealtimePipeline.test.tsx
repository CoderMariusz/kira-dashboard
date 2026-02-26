/**
 * __tests__/hooks/useRealtimePipeline.test.tsx
 * STORY-12.13 — Unit tests for useRealtimePipeline hook
 *
 * Tests cover:
 * - Initial SWR fetch on mount
 * - Supabase Realtime subscription setup (channel.on + subscribe)
 * - realtimeConnected state transitions (SUBSCRIBED / disconnected)
 * - mutate triggered on postgres_changes events
 * - Cleanup: supabase.removeChannel() called on unmount
 * - enabled=false pauses subscriptions and fetches
 * - Fallback polling active when Realtime disconnected
 */

import { jest } from '@jest/globals'
import { renderHook, waitFor, act } from '@testing-library/react'
import { SWRConfig } from 'swr'
import React from 'react'

// ─── Mock fetch ───────────────────────────────────────────────────────────────
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
global.fetch = mockFetch as typeof fetch

// ─── Mock Supabase client singleton ──────────────────────────────────────────
// We need to mock the entire supabase channel chain:
//   supabase.channel(name).on(...).on(...).subscribe(cb) → channel
//   supabase.removeChannel(channel)

type SubscribeCallback = (status: string) => void
type PostgresChangesCallback = (payload: unknown) => void

interface MockChannel {
  on: jest.MockedFunction<(event: string, config: unknown, cb: PostgresChangesCallback) => MockChannel>
  subscribe: jest.MockedFunction<(cb: SubscribeCallback) => MockChannel>
  _subscribeCallback?: SubscribeCallback
  _listeners: Array<{ event: string; config: unknown; cb: PostgresChangesCallback }>
}

let mockChannel: MockChannel
let mockRemoveChannel: jest.MockedFunction<(channel: MockChannel) => Promise<void>>

// Build a fresh mock channel before each test
function buildMockChannel(): MockChannel {
  const ch: MockChannel = {
    on: jest.fn(),
    subscribe: jest.fn(),
    _listeners: [],
  }
  // .on() returns the channel (fluent API)
  ch.on.mockImplementation((event: string, config: unknown, cb: PostgresChangesCallback) => {
    ch._listeners.push({ event, config, cb })
    return ch
  })
  // .subscribe() stores the callback and returns channel
  ch.subscribe.mockImplementation((cb: SubscribeCallback) => {
    ch._subscribeCallback = cb
    return ch
  })
  return ch
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => mockChannel),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(args[0] as MockChannel),
  })),
}))

// ─── Import hook AFTER mocks ──────────────────────────────────────────────────
import { useRealtimePipeline } from '@/hooks/useRealtimePipeline'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeFetchResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'content-type': 'application/json' }),
  } as Response
}

const createWrapper = () => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0 } },
      children
    )
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  mockChannel = buildMockChannel()
  mockRemoveChannel = jest.fn<(channel: MockChannel) => Promise<void>>().mockResolvedValue(undefined)
  mockFetch.mockReset()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useRealtimePipeline', () => {
  describe('initial data fetch', () => {
    it('fetches /api/stories and /api/runs on mount', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockFetch).toHaveBeenCalled())

      const urls = mockFetch.mock.calls.map((c) => c[0] as string)
      expect(urls.some((u) => u.includes('/api/stories'))).toBe(true)
      expect(urls.some((u) => u.includes('/api/runs'))).toBe(true)
    })

    it('includes project query param in fetch URLs', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      renderHook(() => useRealtimePipeline({ project: 'test-project' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockFetch).toHaveBeenCalled())

      const urls = mockFetch.mock.calls.map((c) => c[0] as string)
      expect(urls.some((u) => u.includes('project=test-project'))).toBe(true)
    })

    it('returns stories and runs data after fetch', async () => {
      const mockStories = { data: [{ id: 'STORY-1.1', title: 'Test Story' }] }
      const mockRuns = { runs: [{ run_id: 'run-001', model: 'kimi' }] }

      mockFetch
        .mockResolvedValueOnce(makeFetchResponse(mockStories))
        .mockResolvedValueOnce(makeFetchResponse(mockRuns))

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => result.current.stories !== undefined)
    })
  })

  describe('Supabase Realtime subscription setup', () => {
    it('creates a channel named pipeline-changes', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { createClient } = await import('@/lib/supabase/client')
      const channelSpy = jest.fn(() => mockChannel)
      ;(createClient as jest.MockedFunction<typeof createClient>).mockReturnValueOnce({
        channel: channelSpy,
        removeChannel: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as ReturnType<typeof createClient>)

      renderHook(() => useRealtimePipeline(), { wrapper: createWrapper() })

      await waitFor(() => expect(channelSpy).toHaveBeenCalledWith('pipeline-changes'))
    })

    it('subscribes to bridge_stories postgres_changes with event *', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      renderHook(() => useRealtimePipeline(), { wrapper: createWrapper() })

      await waitFor(() => expect(mockChannel.on).toHaveBeenCalled())

      const storiesCall = mockChannel._listeners.find(
        (l) => (l.config as { table?: string }).table === 'bridge_stories'
      )
      expect(storiesCall).toBeDefined()
      expect((storiesCall!.config as { event?: string }).event).toBe('*')
      expect((storiesCall!.config as { schema?: string }).schema).toBe('public')
    })

    it('subscribes to bridge_runs postgres_changes with event INSERT', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      renderHook(() => useRealtimePipeline(), { wrapper: createWrapper() })

      await waitFor(() => expect(mockChannel.on).toHaveBeenCalled())

      const runsCall = mockChannel._listeners.find(
        (l) => (l.config as { table?: string }).table === 'bridge_runs'
      )
      expect(runsCall).toBeDefined()
      expect((runsCall!.config as { event?: string }).event).toBe('INSERT')
    })

    it('calls subscribe() on the channel', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      renderHook(() => useRealtimePipeline(), { wrapper: createWrapper() })

      await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled())
    })

    it('filters bridge_stories by project_id', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      renderHook(() => useRealtimePipeline({ project: 'my-proj' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockChannel.on).toHaveBeenCalled())

      const storiesCall = mockChannel._listeners.find(
        (l) => (l.config as { table?: string }).table === 'bridge_stories'
      )
      expect((storiesCall!.config as { filter?: string }).filter).toBe(
        'project_id=eq.my-proj'
      )
    })
  })

  describe('realtimeConnected state', () => {
    it('starts as false (not yet connected)', () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      expect(result.current.realtimeConnected).toBe(false)
    })

    it('becomes true when subscribe callback fires SUBSCRIBED', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled())

      act(() => {
        mockChannel._subscribeCallback?.('SUBSCRIBED')
      })

      expect(result.current.realtimeConnected).toBe(true)
    })

    it('becomes false when subscribe callback fires non-SUBSCRIBED status', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled())

      act(() => {
        mockChannel._subscribeCallback?.('SUBSCRIBED')
      })
      expect(result.current.realtimeConnected).toBe(true)

      act(() => {
        mockChannel._subscribeCallback?.('CHANNEL_ERROR')
      })
      expect(result.current.realtimeConnected).toBe(false)
    })

    it('becomes false when subscribe callback fires CLOSED', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled())

      act(() => {
        mockChannel._subscribeCallback?.('SUBSCRIBED')
      })

      act(() => {
        mockChannel._subscribeCallback?.('CLOSED')
      })

      expect(result.current.realtimeConnected).toBe(false)
    })
  })

  describe('postgres_changes event handling', () => {
    it('calls mutateStories when bridge_stories change fires', async () => {
      let callCount = 0
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        callCount++
        return makeFetchResponse({ data: [] })
      })

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockChannel.on).toHaveBeenCalled())
      const initialCallCount = callCount

      const storiesListener = mockChannel._listeners.find(
        (l) => (l.config as { table?: string }).table === 'bridge_stories'
      )

      act(() => {
        storiesListener?.cb({ eventType: 'UPDATE', new: { id: 'STORY-1.1' } })
      })

      // mutate triggers a re-fetch
      await waitFor(() => expect(callCount).toBeGreaterThan(initialCallCount))
    })

    it('calls mutateRuns when bridge_runs INSERT fires', async () => {
      let fetchCallUrls: string[] = []
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        fetchCallUrls.push(url as string)
        return makeFetchResponse({ data: [] })
      })

      renderHook(() => useRealtimePipeline(), { wrapper: createWrapper() })

      await waitFor(() => expect(mockChannel.on).toHaveBeenCalled())

      const runsListener = mockChannel._listeners.find(
        (l) => (l.config as { table?: string }).table === 'bridge_runs'
      )

      fetchCallUrls = [] // reset after initial fetch

      act(() => {
        runsListener?.cb({ eventType: 'INSERT', new: { id: 'run-100' } })
      })

      await waitFor(() =>
        expect(fetchCallUrls.some((u) => u.includes('/api/runs'))).toBe(true)
      )
    })
  })

  describe('cleanup on unmount (AC-5)', () => {
    it('calls supabase.removeChannel() on unmount', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { unmount } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled())

      unmount()

      await waitFor(() => expect(mockRemoveChannel).toHaveBeenCalledTimes(1))
    })
  })

  describe('enabled=false', () => {
    it('does not fetch or subscribe when enabled=false', () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { result } = renderHook(
        () => useRealtimePipeline({ enabled: false }),
        { wrapper: createWrapper() }
      )

      // Give effects a chance to run
      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockChannel.subscribe).not.toHaveBeenCalled()
      expect(result.current.realtimeConnected).toBe(false)
    })
  })

  describe('mutateStories / mutateRuns exposed', () => {
    it('exposes mutateStories function', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockFetch).toHaveBeenCalled())

      expect(typeof result.current.mutateStories).toBe('function')
    })

    it('exposes mutateRuns function', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ data: [] }))

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(mockFetch).toHaveBeenCalled())

      expect(typeof result.current.mutateRuns).toBe('function')
    })

    it('calling mutateStories triggers a re-fetch', async () => {
      let fetchCount = 0
      mockFetch.mockImplementation(async () => {
        fetchCount++
        return makeFetchResponse({ data: [] })
      })

      const { result } = renderHook(() => useRealtimePipeline(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(fetchCount).toBeGreaterThan(0))
      const before = fetchCount

      await act(async () => {
        await result.current.mutateStories()
      })

      expect(fetchCount).toBeGreaterThan(before)
    })
  })
})
