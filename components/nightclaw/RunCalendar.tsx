'use client'
/**
 * components/nightclaw/RunCalendar.tsx
 * STORY-9.7 — 90-day calendar showing NightClaw run history.
 * Dots colored by status: ok=green, error=red, missing=grey.
 * Clicking a non-missing dot calls onDateSelect.
 */

import { useNightClawHistory } from '@/hooks/useNightClawHistory'
import type { RunStatus } from '@/types/nightclaw'

interface RunCalendarProps {
  onDateSelect: (date: string) => void
  selectedDate: string
}

const STATUS_COLOR: Record<RunStatus, string> = {
  ok: '#22c55e',
  error: '#ef4444',
  missing: '#374151',
}

const COLORS = {
  card: '#1a1730',
  border: '#3b3d7a',
  muted: '#4b4569',
  bg: '#0d0c1a',
} as const

export function RunCalendar({ onDateSelect, selectedDate }: RunCalendarProps) {
  const { data, isLoading } = useNightClawHistory()

  if (isLoading) {
    return (
      <div
        data-testid="run-calendar-skeleton"
        style={{
          background: COLORS.card,
          borderRadius: '10px',
          height: '192px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    )
  }

  const entries = data?.entries ?? []
  const entryMap = new Map(entries.map(e => [e.date, e.status]))

  // Generate last 90 days (oldest → newest)
  const days: string[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  // Group by month (YYYY-MM → days[])
  const months = new Map<string, string[]>()
  days.forEach(day => {
    const month = day.substring(0, 7)
    if (!months.has(month)) months.set(month, [])
    months.get(month)!.push(day)
  })

  return (
    <div data-testid="run-calendar" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Array.from(months.entries()).map(([month, monthDays]) => {
        const [year, m] = month.split('-')
        const monthName = new Date(Number(year), Number(m) - 1).toLocaleString('pl-PL', {
          month: 'long',
          year: 'numeric',
        })

        return (
          <div key={month}>
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: COLORS.muted,
                marginBottom: '8px',
                textTransform: 'capitalize',
              }}
            >
              {monthName}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {monthDays.map(day => {
                const status: RunStatus = (entryMap.get(day) ?? 'missing') as RunStatus
                const isSelected = day === selectedDate
                const isClickable = status !== 'missing'

                return (
                  <button
                    key={day}
                    data-testid={`calendar-dot-${day}`}
                    onClick={() => isClickable && onDateSelect(day)}
                    title={`${day}: ${status}`}
                    aria-label={`${day}: ${status}${isSelected ? ' (wybrano)' : ''}`}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: 'none',
                      padding: 0,
                      backgroundColor: STATUS_COLOR[status],
                      cursor: isClickable ? 'pointer' : 'default',
                      outline: isSelected ? `2px solid #ffffff` : 'none',
                      outlineOffset: isSelected ? '2px' : undefined,
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (isClickable) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.25)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                    }}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: COLORS.muted }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block', backgroundColor: '#22c55e' }} />
          OK
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block', backgroundColor: '#ef4444' }} />
          Błąd
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block', backgroundColor: '#374151' }} />
          Brak
        </span>
      </div>
    </div>
  )
}

export default RunCalendar
