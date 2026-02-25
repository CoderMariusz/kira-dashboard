/**
 * __tests__/components/nightclaw/RunCalendar.test.tsx
 * STORY-9.7 — Tests for RunCalendar component (90-day calendar grid)
 */

import { jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { SWRConfig } from 'swr'

const mockUseNightClawHistory = jest.fn()

jest.mock('@/hooks/useNightClawHistory', () => ({
  useNightClawHistory: () => mockUseNightClawHistory(),
}))

import RunCalendar from '@/components/nightclaw/RunCalendar'

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    )
  }
}

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)

function daysAgo(n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const mockHistoryData = {
  entries: [
    { date: daysAgo(1), status: 'ok' as const },
    { date: daysAgo(2), status: 'ok' as const },
    { date: daysAgo(5), status: 'error' as const },
    { date: daysAgo(10), status: 'ok' as const },
    { date: daysAgo(95), status: 'ok' as const },
  ],
  total_runs: 4,
  total_errors: 1,
}

describe('RunCalendar', () => {
  beforeEach(() => { mockUseNightClawHistory.mockClear() })

  it('renders without crashing', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    expect(screen.getByTestId('run-calendar')).toBeInTheDocument()
  })

  it('renders calendar day cells', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    const dayCells = screen.getAllByTestId(/^calendar-day-/)
    expect(dayCells.length).toBeGreaterThanOrEqual(90)
    expect(dayCells.length).toBeLessThanOrEqual(91)
  })

  it('shows loading state', () => {
    mockUseNightClawHistory.mockReturnValue({ data: undefined, isLoading: true, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    expect(screen.getByTestId('calendar-skeleton')).toBeInTheDocument()
  })

  it('renders month headers', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    expect(screen.getAllByTestId(/^calendar-month-/).length).toBeGreaterThanOrEqual(1)
  })

  it('marks ok days', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    expect(screen.getByTestId(`calendar-day-${daysAgo(1)}`)).toHaveAttribute('data-status', 'ok')
  })

  it('marks error days', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    expect(screen.getByTestId(`calendar-day-${daysAgo(5)}`)).toHaveAttribute('data-status', 'error')
  })

  it('marks missing days', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    expect(screen.getByTestId(`calendar-day-${daysAgo(3)}`)).toHaveAttribute('data-status', 'missing')
  })

  it('does not render days older than 90 days', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    expect(screen.queryByTestId(`calendar-day-${daysAgo(95)}`)).toBeNull()
  })

  it('calls onDateSelect on run day click', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    const onDateSelect = jest.fn()
    render(<RunCalendar onDateSelect={onDateSelect} />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId(`calendar-day-${daysAgo(1)}`))
    expect(onDateSelect).toHaveBeenCalledWith(daysAgo(1))
  })

  it('highlights selectedDate', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar selectedDate={daysAgo(2)} onDateSelect={jest.fn()} />, { wrapper: createWrapper() })
    expect(screen.getByTestId(`calendar-day-${daysAgo(2)}`)).toHaveAttribute('data-selected', 'true')
  })

  it('marks today', () => {
    mockUseNightClawHistory.mockReturnValue({ data: mockHistoryData, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    expect(screen.getByTestId(`calendar-day-${todayStr}`)).toHaveAttribute('data-today', 'true')
  })

  it('renders with empty history', () => {
    mockUseNightClawHistory.mockReturnValue({ data: { entries: [], total_runs: 0, total_errors: 0 }, isLoading: false, error: undefined, refresh: jest.fn() })
    render(<RunCalendar />, { wrapper: createWrapper() })
    const dayCells = screen.getAllByTestId(/^calendar-day-/)
    expect(dayCells.every(c => c.getAttribute('data-status') === 'missing')).toBe(true)
  })
})
