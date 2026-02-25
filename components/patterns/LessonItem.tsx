'use client'

/**
 * components/patterns/LessonItem.tsx
 * STORY-8.6 — Individual lesson accordion item
 */

import { useState } from 'react'
import type { Lesson, LessonSeverity } from '@/types/patterns'

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
  critical: { bg: '#2d0a0a', text: '#f87171', color: '#f87171', label: '🔴 CRITICAL' },
  warning:  { bg: '#2d2000', text: '#fbbf24', color: '#fbbf24', label: '🟡 WARNING'  },
  info:     { bg: '#1e1b4b', text: '#818cf8', color: '#818cf8', label: '🔵 INFO'     },
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface LessonItemProps {
  lesson: Lesson
  defaultOpen?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LessonItem({ lesson, defaultOpen = false }: LessonItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const sev = SEVERITY[lesson.severity]

  function toggle() {
    setIsOpen(prev => !prev)
  }

  return (
    <article
      aria-expanded={isOpen}
      style={{
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: '0',
      }}
    >
      {/* ── Header (clickable) ── */}
      <button
        aria-label={`Rozwiń lekcję ${lesson.title}`}
        onClick={toggle}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          padding: '14px 0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          color: C.text,
        }}
      >
        {/* Severity pill */}
        <span
          style={{
            flexShrink: 0,
            background: sev.bg,
            color: sev.text,
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            marginTop: '2px',
          }}
        >
          {sev.label}
        </span>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: C.text,
              marginBottom: '6px',
              lineHeight: '1.4',
            }}
          >
            {lesson.id}: {lesson.title}
          </div>

          {/* Meta row: category + date + tags */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            {/* Category pill */}
            <span
              style={{
                background: C.border,
                color: C.secondary,
                borderRadius: '4px',
                padding: '1px 7px',
                fontWeight: 500,
              }}
            >
              {lesson.category}
            </span>

            {/* Date */}
            {lesson.date && (
              <span style={{ color: C.secondary }}>
                📅 {lesson.date}
              </span>
            )}

            {/* Tags */}
            {lesson.tags.map(tag => (
              <span
                key={tag}
                style={{
                  background: '#1e1b4b',
                  color: '#818cf8',
                  borderRadius: '4px',
                  padding: '1px 7px',
                  fontSize: '11px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Chevron */}
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: C.secondary,
            fontSize: '12px',
            marginTop: '3px',
            display: 'inline-block',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          ▼
        </span>
      </button>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div
          style={{
            paddingBottom: '20px',
            paddingLeft: '0',
          }}
        >
          {/* Body */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: C.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px',
              }}
            >
              Co poszło nie tak:
            </div>
            <div
              style={{
                fontSize: '13px',
                color: C.text,
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}
            >
              {lesson.body}
            </div>
          </div>

          {/* Root cause (conditional) */}
          {lesson.root_cause && (
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: C.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                Root cause:
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: C.text,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {lesson.root_cause}
              </div>
            </div>
          )}

          {/* Fix (conditional) */}
          {lesson.fix && (
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: C.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                Fix:
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: C.text,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {lesson.fix}
              </div>
            </div>
          )}

          {/* Lesson highlight block */}
          <div
            style={{
              borderLeft: '3px solid #818cf8',
              background: C.card,
              borderRadius: '0 8px 8px 0',
              padding: '12px 16px',
              marginTop: '4px',
            }}
          >
            <span style={{ fontSize: '13px', color: C.text, lineHeight: '1.6' }}>
              💡 <strong>Lekcja:</strong> {lesson.lesson}
            </span>
          </div>
        </div>
      )}
    </article>
  )
}
