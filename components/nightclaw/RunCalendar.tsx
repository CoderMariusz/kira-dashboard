'use client'
// components/nightclaw/RunCalendar.tsx — STORY-9.7
import React, { useMemo } from 'react'
import { useNightClawHistory } from '@/hooks/useNightClawHistory'
import type { RunStatus } from '@/types/nightclaw'

interface RunCalendarProps {
  onDateSelect?: (date: string) => void
  selectedDate?: string
}

const STATUS_COLOR: Record<RunStatus, string> = {
  ok: '#22c55e',
  error: '#ef4444',
  missing: '#374151',
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildLast90Days(): string[] {
  const today = new Date()
  const days: string[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(toISO(d))
  }
  return days
}

function groupByMonth(days: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const day of days) {
    const month = day.slice(0, 7)
    if (!groups.has(month)) groups.set(month, [])
    groups.get(month)!.push(day)
  }
  return groups
}

function formatMonthLabel(yearMonth: string): string {
  const [year, m] = yearMonth.split('-')
  const d = new Date(Number(year), Number(m) - 1)
  return d.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })
}

function CalendarSkeleton() {
  return (
    <div
      data-testid="calendar-skeleton"
      style={{
        background: '#1a1730',
        border: '1px solid #3b3d7a',
        borderRadius: '10px',
        height: '220px',
        animation: 'pulse 1.5s ease-in-out infinite',
        opacity: 0.6,
      }}
    />
  )
}

export function RunCalendar({ onDateSelect, selectedDate }: RunCalendarProps) {
  const { data, isLoading } = useNightClawHistory()

  const todayStr = useMemo(() => toISO(new Date()), [])
  const days = useMemo(() => buildLast90Days(), [])

  const entryMap = useMemo<Map<string, RunStatus>>(() => {
    const m = new Map<string, RunStatus>()
    for (const e of data?.entries ?? []) {
      m.set(e.date, e.status)
    }
    return m
  }, [data])

  const months = useMemo(() => groupByMonth(days), [days])

  if (isLoading) {
    return <CalendarSkeleton />
  }

  return (
    <div
      data-testid="run-calendar"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {Array.from(months.entries()).map(([monthKey, monthDays]) => (
        <div key={monthKey}>
          <div
            data-testid={`calendar-month-${monthKey}`}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#818cf8',
              textTransform: 'capitalize',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}
          >
            {formatMonthLabel(monthKey)}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {monthDays.map(day => {
              const status: RunStatus = entryMap.get(day) ?? 'missing'
              const isSelected = day === selectedDate
              const isToday = day === todayStr

              return (
                <button
                  key={day}
                  data-testid={`calendar-day-${day}`}
                  data-status={status}
                  data-selected={isSelected ? 'true' : undefined}
                  data-today={isToday ? 'true' : undefined}
                  onClick={() => onDateSelect?.(day)}
                  title={`${day}: ${status}`}
                  aria-label={`${day}: ${status}`}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #818cf8' : '2px solid transparent',
                    padding: 0,
                    background: STATUS_COLOR[status],
                    cursor: 'pointer',
                    opacity: status === 'missing' ? 0.4 : 1,
                    outline: isToday ? '2px solid #e6edf3' : 'none',
                    outlineOffset: '2px',
                    transition: 'transform 0.1s',
                    boxSizing: 'border-box',
                  }}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default RunCalendar
