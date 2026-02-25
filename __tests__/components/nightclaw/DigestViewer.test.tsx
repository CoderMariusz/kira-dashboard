/**
 * __tests__/components/nightclaw/DigestViewer.test.tsx
 * STORY-9.7 — Tests for DigestViewer component
 */

import { jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

// react-markdown & rehype-highlight are auto-mocked via jest.config moduleNameMapper

const mockUseNightClawDigest = jest.fn()

jest.mock('@/hooks/useNightClawDigest', () => ({
  useNightClawDigest: (...args: unknown[]) => mockUseNightClawDigest(...args),
}))

import DigestViewer from '@/components/nightclaw/DigestViewer'

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    )
  }
}

const today = new Date().toISOString().slice(0, 10)

const mockDigestData = {
  date: '2026-02-25',
  markdown: '# NightClaw Digest\n\nSome content here.\n\n```js\nconsole.log("hello")\n```',
  summary: {
    new_patterns: 3,
    lessons_extracted: 5,
    anti_patterns_flagged: 1,
    open_issues: 2,
    generated_at: '2026-02-25T02:00:00Z',
  },
  model_stats: null,
}

describe('DigestViewer', () => {
  beforeEach(() => {
    mockUseNightClawDigest.mockClear()
  })

  it('renders without crashing', () => {
    mockUseNightClawDigest.mockReturnValue({ data: mockDigestData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    expect(screen.getByTestId('digest-viewer')).toBeInTheDocument()
  })

  it('renders date picker with today as default', () => {
    mockUseNightClawDigest.mockReturnValue({ data: mockDigestData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    const datePicker = screen.getByTestId('digest-date-picker')
    expect(datePicker).toBeInTheDocument()
    expect((datePicker as HTMLInputElement).value).toBe(today)
  })

  it('renders prev and next date buttons', () => {
    mockUseNightClawDigest.mockReturnValue({ data: mockDigestData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    expect(screen.getByTestId('digest-prev-btn')).toBeInTheDocument()
    expect(screen.getByTestId('digest-next-btn')).toBeInTheDocument()
  })

  it('shows loading skeleton while fetching', () => {
    mockUseNightClawDigest.mockReturnValue({ data: undefined, isLoading: true, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    expect(screen.getByTestId('digest-skeleton')).toBeInTheDocument()
  })

  it('shows error message when fetch fails', () => {
    mockUseNightClawDigest.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Network error'), refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    expect(screen.getByTestId('digest-error')).toBeInTheDocument()
  })

  it('shows "no digest" message for empty markdown', () => {
    mockUseNightClawDigest.mockReturnValue({ data: { ...mockDigestData, markdown: '' }, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    expect(screen.getByTestId('digest-empty')).toBeInTheDocument()
  })

  it('renders markdown content when data is loaded', () => {
    mockUseNightClawDigest.mockReturnValue({ data: mockDigestData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    expect(screen.getByTestId('react-markdown-content')).toBeInTheDocument()
    expect(screen.getByTestId('react-markdown-content').textContent).toContain('# NightClaw Digest')
  })

  it('calls useNightClawDigest with the selected date when changed', async () => {
    mockUseNightClawDigest.mockReturnValue({ data: mockDigestData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    const datePicker = screen.getByTestId('digest-date-picker')
    fireEvent.change(datePicker, { target: { value: '2026-02-20' } })
    await waitFor(() => {
      expect(mockUseNightClawDigest).toHaveBeenCalledWith('2026-02-20')
    })
  })

  it('prev button decrements date by 1 day', async () => {
    mockUseNightClawDigest.mockReturnValue({ data: mockDigestData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    const datePicker = screen.getByTestId('digest-date-picker') as HTMLInputElement
    fireEvent.change(datePicker, { target: { value: '2026-02-25' } })
    fireEvent.click(screen.getByTestId('digest-prev-btn'))
    await waitFor(() => { expect(datePicker.value).toBe('2026-02-24') })
  })

  it('next button increments date by 1 day', async () => {
    mockUseNightClawDigest.mockReturnValue({ data: mockDigestData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer />, { wrapper: createWrapper() })
    const datePicker = screen.getByTestId('digest-date-picker') as HTMLInputElement
    fireEvent.change(datePicker, { target: { value: '2026-02-25' } })
    fireEvent.click(screen.getByTestId('digest-next-btn'))
    await waitFor(() => { expect(datePicker.value).toBe('2026-02-26') })
  })

  it('accepts an initial date prop', () => {
    mockUseNightClawDigest.mockReturnValue({ data: mockDigestData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<DigestViewer initialDate="2026-02-10" />, { wrapper: createWrapper() })
    const datePicker = screen.getByTestId('digest-date-picker') as HTMLInputElement
    expect(datePicker.value).toBe('2026-02-10')
    expect(mockUseNightClawDigest).toHaveBeenCalledWith('2026-02-10')
  })
})
