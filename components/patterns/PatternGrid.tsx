'use client'

/**
 * components/patterns/PatternGrid.tsx
 * STORY-8.5 — Grid wrapper with empty state for PatternCard list
 */

import type { PatternCard as PatternCardType } from '@/types/patterns'
import { PatternCard } from './PatternCard'

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  secondary: '#94a3b8',
} as const

// ─── PatternGrid ──────────────────────────────────────────────────────────────
interface PatternGridProps {
  patterns: PatternCardType[]
  activeTag: string | null
  onTagFilter: (tag: string) => void
}

export function PatternGrid({ patterns, activeTag, onTagFilter }: PatternGridProps) {
  if (patterns.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: C.secondary,
          fontSize: '14px',
        }}
      >
        Brak wzorców pasujących do filtrów 🔍
      </div>
    )
  }

  return (
    <>
      {/* Responsive grid breakpoints via scoped style */}
      <style>{`
        .kira-pattern-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 16px;
        }
        @media (min-width: 768px) {
          .kira-pattern-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1280px) {
          .kira-pattern-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
      <div className="kira-pattern-grid">
        {patterns.map((pattern) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            activeTag={activeTag}
            onTagFilter={onTagFilter}
          />
        ))}
      </div>
    </>
  )
}
