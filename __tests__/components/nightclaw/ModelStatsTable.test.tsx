/**
 * __tests__/components/nightclaw/ModelStatsTable.test.tsx
 * STORY-9.8 -- Tests for ModelStatsTable component
 */

import { jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { SWRConfig } from 'swr'

const mockUseNightClawDigest = jest.fn()

jest.mock('@/hooks/useNightClawDigest', () => ({
  useNightClawDigest: (...args: unknown[]) => mockUseNightClawDigest(...args),
}))

import ModelStatsTable from '@/components/nightclaw/ModelStatsTable'
import type { DigestResponse } from '@/types/nightclaw'

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    )
  }
}

const MOCK_DIGEST_DATA: DigestResponse = {
  date: '2026-02-25',
  markdown: '# Digest',
  summary: { new_patterns: 3, lessons_extracted: 5, anti_patterns_flagged: 1, open_issues: 2, generated_at: '2026-02-25T02:00:00Z' },
  model_stats: {
    models: {
      kimi: { stories_completed: 15, stories_failed: 2, success_rate: 0.88, avg_duration_min: 4.2, last_story_id: 'STORY-9.5', stories_with_refactor: 1 },
      'glm-5': { stories_completed: 8, stories_failed: 3, success_rate: 0.73, avg_duration_min: 6.1, last_story_id: 'STORY-9.3', stories_with_refactor: 2 },
      sonnet: { stories_completed: 20, stories_failed: 1, success_rate: 0.95, avg_duration_min: 3.8, last_story_id: 'STORY-9.8', stories_with_refactor: 0 },
    },
    last_updated: '2026-02-25T02:00:00Z',
    next_review: '2026-03-04T02:00:00Z',
  },
}

describe('ModelStatsTable', () => {
  beforeEach(() => {
    mockUseNightClawDigest.mockClear()
  })

  it('renders without crashing', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-stats-table')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseNightClawDigest.mockReturnValue({ data: undefined, isLoading: true, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-stats-loading')).toBeInTheDocument()
  })

  it('shows empty state when no model_stats', () => {
    mockUseNightClawDigest.mockReturnValue({ data: { ...MOCK_DIGEST_DATA, model_stats: null }, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-stats-empty')).toBeInTheDocument()
    expect(screen.getByText(/Brak statystyk modeli/i)).toBeInTheDocument()
  })

  it('renders table headers', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByText('Model')).toBeInTheDocument()
    expect(screen.getByText('Stories OK')).toBeInTheDocument()
    expect(screen.getByText('Stories Failed')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Duration')).toBeInTheDocument()
  })

  it('renders a row for each model', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-row-kimi')).toBeInTheDocument()
    expect(screen.getByTestId('model-row-glm-5')).toBeInTheDocument()
    expect(screen.getByTestId('model-row-sonnet')).toBeInTheDocument()
  })

  it('rows are sorted descending by success_rate', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    const rows = screen.getAllByTestId(/^model-row-/)
    expect(rows[0]).toHaveAttribute('data-testid', 'model-row-sonnet')
    expect(rows[1]).toHaveAttribute('data-testid', 'model-row-kimi')
    expect(rows[2]).toHaveAttribute('data-testid', 'model-row-glm-5')
  })

  it('shows checkmark badge for success_rate >= 0.80', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-row-kimi').textContent).toContain('\u2705')
  })

  it('shows red circle badge for success_rate < 0.80', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-row-glm-5').textContent).toContain('🔴')
  })

  it('displays correct success rate percentage', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-row-sonnet').textContent).toContain('95%')
  })

  it('displays stories_completed and stories_failed', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    const kimiRow = screen.getByTestId('model-row-kimi')
    expect(kimiRow.textContent).toContain('15')
    expect(kimiRow.textContent).toContain('2')
  })

  it('displays avg duration', () => {
    mockUseNightClawDigest.mockReturnValue({ data: MOCK_DIGEST_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-row-kimi').textContent).toContain('4.2')
  })

  it('shows error state on fetch error', () => {
    mockUseNightClawDigest.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Network error'), refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-stats-error')).toBeInTheDocument()
  })

  it('shows empty state when model_stats.models is empty', () => {
    mockUseNightClawDigest.mockReturnValue({ data: { ...MOCK_DIGEST_DATA, model_stats: { models: {}, last_updated: '', next_review: '' } }, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ModelStatsTable />, { wrapper: createWrapper() })
    expect(screen.getByTestId('model-stats-empty')).toBeInTheDocument()
  })
})
