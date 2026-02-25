'use client'

/**
 * components/patterns/LessonsTimeline.tsx
 * STORY-8.6 — Timeline list with severity filter + empty state
 */

import { useMemo } from 'react'
import type { Lesson, LessonSeverity } from '@/types/patterns'
import { LessonItem } from './LessonItem'

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0d0c1a',
  card:      '#1a1730',
  border:    '#2a2540',
  accent:    '#818cf8',
  text:      '#e2e8f0',
  secondary: '#94a3b8',
} as const

const SEVERITY: Record<LessonSeverity, { bg: string; text: string; color: string; label: string }> = {
  critical: { bg: '#2d0a0a', text: '#f87171', color: '#f87171', label: '🔴 Critical' },
  warning:  { bg: '#2d2000', text: '#fbbf24', color: '#fbbf24', label: '🟡 Warning'  },
  info:     { bg: '#1e1b4b', text: '#818cf8', color: '#818cf8', label: '🔵 Info'     },
}

// ─── Severity ordering for sorting ───────────────────────────────────────────
const SEVERITY_VALUES: LessonSeverity[] = ['critical', 'warning', 'info']

// ─── Sort: newest first, null dates at end ────────────────────────────────────
function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    if (a.date === null && b.date === null) return 0
    if (a.date === null) return 1
    if (b.date === null) return -1
    return b.date.localeCompare(a.date)
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface LessonsTimelineProps {
  lessons: Lesson[]
  activeSeverity: LessonSeverity | null
  onSeverityChange: (s: LessonSeverity | null) => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LessonsTimeline({
  lessons,
  activeSeverity,
  onSeverityChange,
}: LessonsTimelineProps) {

  // Filter by severity (query+tag filtering is done by parent)
  const filteredAndSorted = useMemo(() => {
    const filtered = activeSeverity
      ? lessons.filter(l => l.severity === activeSeverity)
      : lessons
    return sortLessons(filtered)
  }, [lessons, activeSeverity])

  function handleSeverityClick(severity: LessonSeverity) {
    // Toggle: clicking active filter resets to null
    if (activeSeverity === severity) {
      onSeverityChange(null)
    } else {
      onSeverityChange(severity)
    }
  }

  return (
    <div>
      {/* ── Severity filter bar ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color: C.secondary,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          Filtruj:
        </span>

        {/* "Wszystkie" button */}
        <button
          onClick={() => onSeverityChange(null)}
          style={{
            background: activeSeverity === null ? C.accent : 'transparent',
            border: `1px solid ${activeSeverity === null ? C.accent : C.border}`,
            borderRadius: '6px',
            color: activeSeverity === null ? '#fff' : C.secondary,
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Wszystkie
        </button>

        {/* Severity buttons */}
        {SEVERITY_VALUES.map(severity => {
          const sev = SEVERITY[severity]
          const isActive = activeSeverity === severity
          return (
            <button
              key={severity}
              onClick={() => handleSeverityClick(severity)}
              style={{
                background: isActive ? sev.color : 'transparent',
                border: `1px solid ${isActive ? sev.color : C.border}`,
                borderRadius: '6px',
                color: isActive ? '#fff' : sev.color,
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {sev.label}
            </button>
          )
        })}
      </div>

      {/* ── Empty state ── */}
      {filteredAndSorted.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: C.secondary,
            paddingTop: '48px',
            paddingBottom: '48px',
            fontSize: '14px',
          }}
        >
          Brak lekcji pasujących do filtrów ⚠️
        </div>
      ) : (
        /* ── Timeline list ── */
        <div
          style={{
            position: 'relative',
          }}
        >
          {/* Vertical timeline line — desktop only */}
          <div
            className="timeline-line"
            style={{
              position: 'absolute',
              left: '7px',
              top: '24px',
              bottom: '24px',
              width: '2px',
              background: C.border,
            }}
          />

          {/* Items */}
          <div style={{ paddingLeft: '28px' }}>
            {filteredAndSorted.map(lesson => {
              const sev = SEVERITY[lesson.severity]
              return (
                <div
                  key={lesson.id}
                  style={{
                    position: 'relative',
                  }}
                >
                  {/* Dot on timeline */}
                  <div
                    className="timeline-dot"
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '20px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: sev.color,
                      border: `2px solid ${C.bg}`,
                      flexShrink: 0,
                    }}
                  />

                  <LessonItem lesson={lesson} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Mobile styles: hide timeline line+dots on narrow screens ── */}
      <style>{`
        @media (max-width: 375px) {
          .timeline-line { display: none !important; }
          .timeline-dot  { display: none !important; }
        }
      `}</style>
    </div>
  )
}
