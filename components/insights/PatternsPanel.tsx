'use client'

// components/insights/PatternsPanel.tsx
// Panel z top 5 potwierdzonych wzorców.
// Kliknięcie wiersza otwiera PatternModal z pełnym opisem.

import { useState } from 'react'
import { usePatterns } from '@/hooks/usePatterns'
import { PatternModal } from './PatternModal'
import type { Pattern } from '@/types/insights'

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeStyleConfig {
  background: string
  color: string
  label: string
}

function getPatternBadgeStyle(type: string): BadgeStyleConfig {
  switch (type) {
    case 'PATTERN':
      return { background: '#1a3a5c', color: '#60a5fa', label: 'PATTERN' }
    case 'ANTI':
      return { background: '#3a1a1a', color: '#f87171', label: 'ANTI' }
    case 'LESSON':
      return { background: '#2d1b4a', color: '#a78bfa', label: 'LESSON' }
    default:
      // EC-2: nieznany typ — bezpieczny fallback (nie crashuje)
      return { background: '#2a2540', color: '#6b7280', label: '???' }
  }
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface PatternRowProps {
  pattern: Pattern
  onClick: (p: Pattern) => void
}

function PatternRow({ pattern, onClick }: PatternRowProps) {
  const badge = getPatternBadgeStyle(pattern.type)
  const [hovered, setHovered] = useState(false)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(pattern)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Otwórz szczegóły wzorca: ${pattern.topic}`}
      onClick={() => onClick(pattern)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: hovered ? '#1f1c2e' : '#13111c',
        borderRadius: 6,
        padding: '6px 9px',
        marginBottom: 5,
        cursor: 'pointer',
        transition: 'background .12s',
        outline: 'none',
      }}
    >
      {/* Badge */}
      <span
        style={{
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 6,
          fontWeight: 700,
          background: badge.background,
          color: badge.color,
          flexShrink: 0,
        }}
      >
        {badge.label}
      </span>

      {/* Topic */}
      <span style={{ fontSize: 12, color: '#e6edf3', flex: 1, minWidth: 0 }}>
        {pattern.topic}
      </span>

      {/* Count */}
      <span style={{ fontSize: 10, color: '#4b4569', flexShrink: 0 }}>
        {pattern.occurrence_count}×
      </span>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PatternsSkeleton() {
  return (
    <div
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: 10,
        padding: 15,
      }}
    >
      {/* Header skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div
          style={{ height: 13, width: '40%', background: '#2a2540', borderRadius: 4 }}
          className="animate-pulse"
        />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: 36,
            background: '#2a2540',
            borderRadius: 6,
            marginBottom: 5,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Panel z listą top 5 potwierdzonych wzorców.
 * Kliknięcie wiersza otwiera PatternModal.
 */
export function PatternsPanel() {
  const { patterns, loading, offline } = usePatterns()
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null)

  if (loading) return <PatternsSkeleton />

  const cardStyle: React.CSSProperties = {
    background: '#1a1730',
    border: '1px solid #2a2540',
    borderRadius: 10,
    padding: 15,
  }

  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>Top Patterns</span>
      <span
        style={{
          fontSize: 11,
          color: '#818cf8',
          cursor: 'pointer',
          marginLeft: 'auto',
        }}
      >
        All →
      </span>
    </div>
  )

  if (offline) {
    return (
      <div style={cardStyle} role="region" aria-label="Top 5 potwierdzonych wzorców">
        {header}
        <div style={{ fontSize: 12, color: '#4b4569', textAlign: 'center', padding: '16px 0' }}>
          Wzorce niedostępne — Bridge API offline
        </div>
      </div>
    )
  }

  if (!patterns || patterns.length === 0) {
    return (
      <div style={cardStyle} role="region" aria-label="Top 5 potwierdzonych wzorców">
        {header}
        <div style={{ fontSize: 12, color: '#4b4569', textAlign: 'center', padding: '16px 0' }}>
          Brak potwierdzonych wzorców
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={cardStyle} role="region" aria-label="Top 5 potwierdzonych wzorców">
        {header}
        {patterns.map((pattern) => (
          <PatternRow
            key={pattern.id}
            pattern={pattern}
            onClick={setSelectedPattern}
          />
        ))}
      </div>

      {/* Modal z pełnym opisem */}
      <PatternModal
        pattern={selectedPattern}
        open={selectedPattern !== null}
        onClose={() => setSelectedPattern(null)}
      />
    </>
  )
}
