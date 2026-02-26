/**
 * __tests__/components/nightclaw/SkillsDiffPanel.test.tsx
 * STORY-9.8
 */
import { jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { SWRConfig } from 'swr'

const mockUseNightClawSkillsDiff = jest.fn()
jest.mock('@/hooks/useNightClawSkillsDiff', () => ({
  useNightClawSkillsDiff: () => mockUseNightClawSkillsDiff(),
}))

import SkillsDiffPanel from '@/components/nightclaw/SkillsDiffPanel'
import type { SkillsDiffResponse } from '@/types/nightclaw'

function W({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
}

const DATA: SkillsDiffResponse = {
  skills: [
    { name: 'kira-orchestrator', path: '/s/o.md', diff: '@@ -10,3 +10,5 @@\n context\n-removed\n+added1\n+added2', lines_added: 2, lines_removed: 1, modified_at: '2026-02-25T01:30:00Z' },
    { name: 'kira-implementor', path: '/s/i.md', diff: '@@ -1,2 +1,3 @@\n ctx\n+new', lines_added: 1, lines_removed: 0, modified_at: '2026-02-25T02:00:00Z' },
  ],
  total_modified: 2,
}

describe('SkillsDiffPanel', () => {
  beforeEach(() => mockUseNightClawSkillsDiff.mockClear())

  it('renders without crashing', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getByTestId('skills-diff-panel')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: undefined, isLoading: true, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getByTestId('skills-diff-loading')).toBeInTheDocument()
  })

  it('shows empty state when no skills changed', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: { skills: [], total_modified: 0 }, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getByTestId('skills-diff-empty')).toBeInTheDocument()
    expect(screen.getByText(/Brak zmian w skillach/i)).toBeInTheDocument()
  })

  it('renders skill name for each skill', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getByText('kira-orchestrator')).toBeInTheDocument()
    expect(screen.getByText('kira-implementor')).toBeInTheDocument()
  })

  it('renders +N badge', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getByTestId('skill-badge-added-0')).toHaveTextContent('+2')
  })

  it('renders -N badge', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getByTestId('skill-badge-removed-0')).toHaveTextContent('-1')
  })

  it('renders diff content block', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getByTestId('skill-diff-content-0')).toBeInTheDocument()
  })

  it('added lines rendered', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getAllByTestId('diff-line-added').length).toBeGreaterThan(0)
  })

  it('removed lines rendered', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getAllByTestId('diff-line-removed').length).toBeGreaterThan(0)
  })

  it('shows error state', () => {
    mockUseNightClawSkillsDiff.mockReturnValue({ data: undefined, isLoading: false, error: new Error('err'), refresh: jest.fn() })
    render(<SkillsDiffPanel />, { wrapper: W })
    expect(screen.getByTestId('skills-diff-error')).toBeInTheDocument()
  })
})
