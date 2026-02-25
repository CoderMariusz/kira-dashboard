/**
 * __tests__/components/eval/RunHistoryTimeline.test.tsx
 * STORY-7.8 — Basic render tests for RunHistoryTimeline component.
 */

import { jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
global.fetch = mockFetch as unknown as typeof fetch

// ─── Import component ─────────────────────────────────────────────────────────

import RunHistoryTimeline from '@/components/eval/RunHistoryTimeline'
import type { EvalRunsListResponse } from '@/lib/eval/types'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as unknown as Response
}

const emptyResponse: EvalRunsListResponse = {
  runs: [],
  total: 0,
  page: 1,
  pageSize: 20,
}

const singleRunResponse: EvalRunsListResponse = {
  runs: [
    {
      id: 'run-001',
      run_type: 'eval',
      status: 'completed',
      started_at: '2026-02-25T14:00:00.000Z',
      finished_at: '2026-02-25T14:02:34.000Z',
      overall_score: 0.87,
      task_count: 16,
      passed_count: 14,
      failed_count: 2,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RunHistoryTimeline', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders without crashing', () => {
    mockFetch.mockResolvedValue(makeJsonResponse(emptyResponse))

    render(
      <RunHistoryTimeline
        selectedRunId={null}
        onSelectRun={jest.fn()}
      />,
      { wrapper: createWrapper() },
    )

    // Section title should appear
    expect(screen.getByText('Historia Runów')).toBeInTheDocument()
  })

  it('shows skeleton rows while loading', () => {
    // Never resolves — keeps loading state
    mockFetch.mockImplementation(() => new Promise(() => {}))

    const { container } = render(
      <RunHistoryTimeline selectedRunId={null} onSelectRun={jest.fn()} />,
      { wrapper: createWrapper() },
    )

    // Title present
    expect(screen.getByText('Historia Runów')).toBeInTheDocument()
    // Container rendered (skeleton divs exist inside)
    expect(container.firstChild).not.toBeNull()
  })

  it('shows empty state when no runs', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(emptyResponse))

    render(
      <RunHistoryTimeline selectedRunId={null} onSelectRun={jest.fn()} />,
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Brak runów eval/i),
      ).toBeInTheDocument()
    })
  })

  it('renders run items when data is loaded', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(singleRunResponse))

    render(
      <RunHistoryTimeline selectedRunId={null} onSelectRun={jest.fn()} />,
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      // Score text should appear — exact '87%' (not raw '0.87%')
      expect(screen.getByText('87%')).toBeInTheDocument()
    })
  })

  it('marks selected run with highlighted style', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(singleRunResponse))

    const { container } = render(
      <RunHistoryTimeline selectedRunId="run-001" onSelectRun={jest.fn()} />,
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(screen.getByText('87%')).toBeInTheDocument()
    })

    // Selected run button should have highlighted border
    const buttons = container.querySelectorAll('button')
    const runButton = Array.from(buttons).find((b) =>
      b.textContent?.includes('87%'),
    )
    expect(runButton).toBeDefined()
    // Inline style should include accent color for selected state
    expect(runButton?.style.borderColor).toBe('rgb(129, 140, 248)')
  })
})
