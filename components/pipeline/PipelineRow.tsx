'use client'

// components/pipeline/PipelineRow.tsx
// Single story row in the Pipeline panel.
// v2 (STORY-2.7): justUpdated flash highlight, isOptimistic indicator, onStart button.
// v3 (STORY-6.8): Bulk selection checkbox with hover-reveal.

import { useState } from 'react'
import type { Story, StoryStatus } from '@/types/bridge'

type StatusStyle = { bg: string; color: string; border?: string; label: string }

const STATUS_STYLES: Record<StoryStatus, StatusStyle> = {
  IN_PROGRESS: { bg: '#1a3a5c', color: '#60a5fa', label: 'IN PROGRESS' },
  REVIEW:      { bg: '#2d1b4a', color: '#a78bfa', label: 'REVIEW' },
  DONE:        { bg: '#1a3a1a', color: '#4ade80', label: 'DONE' },
  REFACTOR:    { bg: '#3a2a00', color: '#fbbf24', label: 'REFACTOR' },
  MERGE:       { bg: '#1a2a1a', color: '#34d399', border: '1px solid #2a5a2a', label: 'MERGE' },
  TODO:        { bg: '#1a1a2a', color: '#6b7280', label: 'TODO' },
  BLOCKED:     { bg: '#3a1a1a', color: '#f87171', label: 'BLOCKED' },
}

const DEFAULT_STYLE: StatusStyle = { bg: '#1a1a2a', color: '#6b7280', label: 'UNKNOWN' }

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return '—'
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  const remMin = diffMin % 60
  return `${diffH}h ${remMin}m ago`
}

interface PipelineRowProps {
  story: Story
  onClick: () => void
  /** true przez 600ms po SSE update — animacja flash highlight (AC-6, STORY-2.7) */
  justUpdated?: boolean
  /** true gdy optimistic update w toku — wyróżnienie (AC-7, STORY-2.7) */
  isOptimistic?: boolean
  /** Opcjonalny handler "▶ Start" — widoczny dla READY/TODO stories (AC-7) */
  onStart?: () => void
  // STORY-6.8 — bulk selection
  /** true gdy row jest zaznaczony (checkbox checked) */
  isSelected?: boolean
  /** Callback do toggle selekcji — przyjmuje story.id */
  onToggleSelect?: (id: string) => void
  /** true gdy bulk mode aktywny (isSelecting) lub hover — pokazuje checkbox */
  showCheckbox?: boolean
}

export default function PipelineRow({
  story,
  onClick,
  justUpdated = false,
  isOptimistic = false,
  onStart,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}: PipelineRowProps) {
  const st: StatusStyle = STATUS_STYLES[story.status] ?? DEFAULT_STYLE
  const timeAgo = formatTimeAgo(story.started_at)

  // Hover state for checkbox reveal (AC-1)
  const [hovered, setHovered] = useState(false)

  // Flash highlight po SSE update — tło #2d1b4a przez 600ms (AC-6)
  // Jeśli optimistic — dodaj lekki opacity efekt
  // Jeśli selected — tło #1e1b38 z border-left (AC-2)
  const rowBg = isSelected ? '#1e1b38' : justUpdated ? '#2d1b4a' : '#13111c'
  const rowOpacity = isOptimistic ? 0.7 : 1.0
  const rowBorderColor = isSelected ? '#818cf8' : hovered ? '#2a2540' : 'transparent'
  const rowBorderLeft = isSelected ? '2px solid #818cf8' : undefined

  // Checkbox visible when: hover OR any story selected (showCheckbox=true = isSelecting)
  const checkboxVisible = showCheckbox || hovered || isSelected

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      aria-label={`Story ${story.id}: ${story.title}${isOptimistic ? ' (przetwarzanie...)' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        background: rowBg,
        borderRadius: '7px',
        padding: '8px 11px',
        marginBottom: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.1s ease, border-color 0.15s, opacity 0.3s',
        border: `1px solid ${rowBorderColor}`,
        borderLeft: rowBorderLeft ?? `1px solid ${rowBorderColor}`,
        outline: 'none',
        opacity: rowOpacity,
      }}
      onFocus={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#818cf8' }}
      onBlur={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'
        }
      }}
    >
      {/* Checkbox — AC-1: hover-reveal, AC-2: permanent when any selected */}
      {onToggleSelect && (
        <input
          type="checkbox"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={`Zaznacz ${story.id}`}
          checked={isSelected}
          tabIndex={0}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelect(story.id)
          }}
          onClick={(e) => {
            // EC-2: stop propagation to prevent row click opening modal
            e.stopPropagation()
          }}
          onKeyDown={(e) => {
            // Space toggles checkbox — keyboard accessibility
            if (e.key === ' ') {
              e.stopPropagation()
            }
          }}
          style={{
            width: '16px',
            height: '16px',
            flexShrink: 0,
            appearance: 'none',
            WebkitAppearance: 'none',
            border: `1.5px solid ${isSelected ? '#818cf8' : '#3b3d7a'}`,
            borderRadius: '4px',
            background: isSelected ? '#818cf8' : 'transparent',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            opacity: checkboxVisible ? 1 : 0,
            pointerEvents: checkboxVisible ? 'auto' : 'none',
            position: 'relative',
            backgroundImage: isSelected
              ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 12 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 5l3.5 4L11 1' stroke='%23fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
              : 'none',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '9px',
          }}
        />
      )}

      {/* Story ID */}
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: '#818cf8',
        width: '78px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {story.id}
      </div>

      {/* Title */}
      <div style={{
        fontSize: '12px',
        color: '#e6edf3',
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {story.title}
      </div>

      {/* Model */}
      <div style={{
        fontSize: '10px',
        color: '#6b7280',
        width: '55px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {story.assigned_model ?? '—'}
      </div>

      {/* Time since start */}
      <div style={{
        fontSize: '10px',
        color: '#4b4569',
        width: '60px',
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {timeAgo}
      </div>

      {/* Start button — AC-7: widoczny dla TODO/READY stories */}
      {onStart && (story.status === 'TODO') && !isOptimistic && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStart()
          }}
          style={{
            background: '#1a3a5c',
            border: '1px solid #2a5a8c',
            borderRadius: '6px',
            padding: '2px 8px',
            color: '#60a5fa',
            fontSize: '10px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label={`Start story ${story.id}`}
        >
          ▶ Start
        </button>
      )}

      {/* Optimistic spinner */}
      {isOptimistic && (
        <div
          style={{
            fontSize: '10px',
            color: '#818cf8',
            flexShrink: 0,
          }}
          title="Przetwarzanie..."
        >
          ⏳
        </div>
      )}

      {/* Status badge */}
      <div style={{
        fontSize: '10px',
        padding: '2px 7px',
        borderRadius: '8px',
        fontWeight: 600,
        flexShrink: 0,
        background: st.bg,
        color: st.color,
        border: st.border ?? 'none',
        whiteSpace: 'nowrap',
      }}>
        {st.label}
      </div>
    </div>
  )
}
