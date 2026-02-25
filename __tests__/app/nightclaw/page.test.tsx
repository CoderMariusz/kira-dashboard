/**
 * __tests__/app/nightclaw/page.test.tsx
 * STORY-9.6 — NightClaw page: layout, sidebar nav, Run Overview cards
 *
 * Test matrix:
 *  TC-1  page renders heading "NightClaw Digest"
 *  TC-2  4 stat cards rendered in loading state (skeletons)
 *  TC-3  4 stat cards rendered with data from useNightClawDigest
 *  TC-4  error state: shows error message + retry button
 *  TC-5  offline state: shows "Bridge offline" badge
 *  TC-6  tab navigation items are rendered (Overview, Digest, Research, Stats)
 *  TC-7  sidebar contains "🌙 NightClaw" nav link
 *  TC-8  date badge (today's date) is rendered
 */

import { jest } from '@jest/globals'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { SWRConfig } from 'swr'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock next/navigation
const mockPush = jest.fn()
const mockPathname = jest.fn(() => '/dashboard/nightclaw')
const mockSearchParams = jest.fn(() => new URLSearchParams())
const mockRouter = { push: mockPush, replace: jest.fn(), back: jest.fn() }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}))

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ href, children, className, 'aria-current': ariaCurrent }: {
    href: string
    children: React.ReactNode
    className?: string
    'aria-current'?: string
  }) {
    return (
      <a href={href} className={className} aria-current={ariaCurrent}>
        {children}
      </a>
    )
  }
})

// Mock hooks
const mockUseNightClawDigest = jest.fn()
const mockUseNightClawHistory = jest.fn()

jest.mock('@/hooks/useNightClawDigest', () => ({
  useNightClawDigest: () => mockUseNightClawDigest(),
}))

jest.mock('@/hooks/useNightClawHistory', () => ({
  useNightClawHistory: () => mockUseNightClawHistory(),
}))

// ─── Import SUT ───────────────────────────────────────────────────────────────

import NightClawPage from '@/app/(dashboard)/dashboard/nightclaw/page'

// ─── Fixtures ────────────────────────────────────────────────────────────────

import type { DigestResponse, HistoryResponse } from '@/types/nightclaw'

const MOCK_DIGEST: DigestResponse = {
  date: '2026-02-25',
  markdown: '# NightClaw Digest',
  summary: {
    new_patterns: 3,
    lessons_extracted: 7,
    anti_patterns_flagged: 1,
    open_issues: 2,
    generated_at: '2026-02-25T02:00:00Z',
  },
  model_stats: {
    models: {
      kimi: {
        stories_completed: 5,
        stories_failed: 1,
        success_rate: 0.83,
        avg_duration_min: 12,
        last_story_id: 'STORY-9.5',
        stories_with_refactor: 2,
      },
    },
    last_updated: '2026-02-25T02:00:00Z',
    next_review: '2026-02-26T02:00:00Z',
  },
}

const MOCK_HISTORY: HistoryResponse = {
  entries: [
    { date: '2026-02-25', status: 'ok' },
    { date: '2026-02-24', status: 'error' },
  ],
  total_runs: 2,
  total_errors: 1,
}

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NightClaw Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname.mockReturnValue('/dashboard/nightclaw')
    mockSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('TC-1: renders heading "NightClaw Digest"', () => {
    mockUseNightClawDigest.mockReturnValue({
      data: MOCK_DIGEST,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })
    mockUseNightClawHistory.mockReturnValue({
      data: MOCK_HISTORY,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })

    render(<NightClawPage />, { wrapper: createWrapper() })

    expect(screen.getByText(/NightClaw Digest/i)).toBeInTheDocument()
  })

  it('TC-2: shows 4 skeleton cards when loading', () => {
    mockUseNightClawDigest.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refresh: jest.fn(),
    })
    mockUseNightClawHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refresh: jest.fn(),
    })

    const { container } = render(<NightClawPage />, { wrapper: createWrapper() })

    // Skeletons should be rendered — check for skeleton elements
    const skeletons = container.querySelectorAll('[data-testid="stat-card-skeleton"]')
    expect(skeletons).toHaveLength(4)
  })

  it('TC-3: shows 4 stat cards with data from useNightClawDigest', async () => {
    mockUseNightClawDigest.mockReturnValue({
      data: MOCK_DIGEST,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })
    mockUseNightClawHistory.mockReturnValue({
      data: MOCK_HISTORY,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })

    render(<NightClawPage />, { wrapper: createWrapper() })

    // 4 stat cards: new_patterns=3, lessons_extracted=7, open_issues=2, modified skills
    await waitFor(() => {
      expect(screen.getByTestId('stat-card-patterns')).toBeInTheDocument()
      expect(screen.getByTestId('stat-card-lessons')).toBeInTheDocument()
      expect(screen.getByTestId('stat-card-issues')).toBeInTheDocument()
      expect(screen.getByTestId('stat-card-skills')).toBeInTheDocument()
    })

    // Values from digest summary
    expect(screen.getByText('3')).toBeInTheDocument() // new_patterns
    expect(screen.getByText('7')).toBeInTheDocument() // lessons_extracted
    expect(screen.getByText('2')).toBeInTheDocument() // open_issues
  })

  it('TC-4: shows error message + retry button on error', () => {
    const mockRefresh = jest.fn()
    mockUseNightClawDigest.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Brak połączenia z serwerem'),
      refresh: mockRefresh,
    })
    mockUseNightClawHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })

    render(<NightClawPage />, { wrapper: createWrapper() })

    expect(screen.getByText(/Brak połączenia z serwerem/i)).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /spróbuj ponownie/i })
    expect(retryBtn).toBeInTheDocument()
    fireEvent.click(retryBtn)
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('TC-5: shows "Bridge offline" badge when offline', () => {
    mockUseNightClawDigest.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Brak połączenia z serwerem'),
      refresh: jest.fn(),
    })
    mockUseNightClawHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })

    render(<NightClawPage />, { wrapper: createWrapper() })

    expect(screen.getByText(/Bridge offline/i)).toBeInTheDocument()
  })

  it('TC-6: renders 4 tab navigation items', () => {
    mockUseNightClawDigest.mockReturnValue({
      data: MOCK_DIGEST,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })
    mockUseNightClawHistory.mockReturnValue({
      data: MOCK_HISTORY,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })

    render(<NightClawPage />, { wrapper: createWrapper() })

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /digest/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /research/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /stats/i })).toBeInTheDocument()
  })

  it('TC-7: sidebar has "🌙 NightClaw" nav link in NavConfig', () => {
    // This test imports NavConfig directly to verify the entry exists
    // It's a unit test of the config, not a DOM test
    const { NAV_CONFIG } = require('@/components/layout/NavConfig')
    const allItems = NAV_CONFIG.flatMap((s: { items: Array<{ label: string }> }) => s.items)
    const nightClawItem = allItems.find((item: { label: string }) =>
      item.label.includes('NightClaw')
    )
    expect(nightClawItem).toBeDefined()
    expect(nightClawItem.icon).toContain('🌙')
    expect(nightClawItem.href).toBe('/dashboard/nightclaw')
  })

  it('TC-8: renders today\'s date badge', () => {
    mockUseNightClawDigest.mockReturnValue({
      data: MOCK_DIGEST,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })
    mockUseNightClawHistory.mockReturnValue({
      data: MOCK_HISTORY,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    })

    render(<NightClawPage />, { wrapper: createWrapper() })

    // Should contain a date badge - today's date
    const dateBadge = screen.getByTestId('date-badge')
    expect(dateBadge).toBeInTheDocument()
    // Date should contain current year
    expect(dateBadge.textContent).toMatch(/202/)
  })
})
