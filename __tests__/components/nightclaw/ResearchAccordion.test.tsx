/**
 * __tests__/components/nightclaw/ResearchAccordion.test.tsx
 * STORY-9.8 -- Tests for ResearchAccordion component
 */

import { jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { SWRConfig } from 'swr'

const mockUseNightClawResearch = jest.fn()

jest.mock('@/hooks/useNightClawResearch', () => ({
  useNightClawResearch: () => mockUseNightClawResearch(),
}))

import ResearchAccordion from '@/components/nightclaw/ResearchAccordion'
import type { ResearchResponse } from '@/types/nightclaw'

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    )
  }
}

const MOCK_RESEARCH_DATA: ResearchResponse = {
  files: [
    {
      filename: 'cost-optimization-research.md',
      title: 'Cost Optimization Research',
      preview: 'First line of research\nSecond line\nThird line',
      content: '# Cost Optimization Research\n\nFull content here.',
      modified_at: '2026-02-25T01:30:00Z',
    },
    {
      filename: 'model-selection-guide.md',
      title: 'Model Selection Guide',
      preview: 'How to select models\nFor different tasks',
      content: '# Model Selection Guide\n\nDetailed guide content.',
      modified_at: '2026-02-24T10:00:00Z',
    },
  ],
}

describe('ResearchAccordion', () => {
  beforeEach(() => {
    mockUseNightClawResearch.mockClear()
  })

  it('renders without crashing', () => {
    mockUseNightClawResearch.mockReturnValue({ data: MOCK_RESEARCH_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    expect(screen.getByTestId('research-accordion')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseNightClawResearch.mockReturnValue({ data: undefined, isLoading: true, error: undefined, refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    expect(screen.getByTestId('research-loading')).toBeInTheDocument()
  })

  it('shows empty state when no research files', () => {
    mockUseNightClawResearch.mockReturnValue({ data: { files: [] }, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    expect(screen.getByTestId('research-empty')).toBeInTheDocument()
    expect(screen.getByText(/Brak plików badań/i)).toBeInTheDocument()
  })

  it('renders accordion items for each research file', () => {
    mockUseNightClawResearch.mockReturnValue({ data: MOCK_RESEARCH_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    expect(screen.getByTestId('research-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('research-item-1')).toBeInTheDocument()
  })

  it('renders filename in accordion header', () => {
    mockUseNightClawResearch.mockReturnValue({ data: MOCK_RESEARCH_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    expect(screen.getByText('cost-optimization-research.md')).toBeInTheDocument()
    expect(screen.getByText('model-selection-guide.md')).toBeInTheDocument()
  })

  it('accordion items are collapsed by default', () => {
    mockUseNightClawResearch.mockReturnValue({ data: MOCK_RESEARCH_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    expect(screen.queryByTestId('research-content-0')).not.toBeInTheDocument()
  })

  it('expands accordion item on click and shows full content', () => {
    mockUseNightClawResearch.mockReturnValue({ data: MOCK_RESEARCH_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('research-trigger-0'))
    expect(screen.getByTestId('research-content-0')).toBeInTheDocument()
    expect(screen.getByTestId('react-markdown-content')).toBeInTheDocument()
  })

  it('collapses expanded item on second click', () => {
    mockUseNightClawResearch.mockReturnValue({ data: MOCK_RESEARCH_DATA, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    const trigger = screen.getByTestId('research-trigger-0')
    fireEvent.click(trigger)
    expect(screen.getByTestId('research-content-0')).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.queryByTestId('research-content-0')).not.toBeInTheDocument()
  })

  it('shows error state on fetch error', () => {
    mockUseNightClawResearch.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Network error'), refresh: jest.fn() })
    render(<ResearchAccordion />, { wrapper: createWrapper() })
    expect(screen.getByTestId('research-error')).toBeInTheDocument()
  })
})
