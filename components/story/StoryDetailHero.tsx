'use client'

// components/story/StoryDetailHero.tsx
// Hero section z ID, tytułem, statusem i modelem story.
// Implementacja STORY-2.6.

import type { Story, StoryStatus } from '@/types/story.types'

interface StatusStyle {
  bg: string
  color: string
}

const STATUS_STYLES: Record<StoryStatus, StatusStyle> = {
  READY:       { bg: '#1a2a3a', color: '#93c5fd' },
  IN_PROGRESS: { bg: '#1a3a5c', color: '#60a5fa' },
  REVIEW:      { bg: '#2d1b4a', color: '#a78bfa' },
  DONE:        { bg: '#1a3a1a', color: '#4ade80' },
  REFACTOR:    { bg: '#3a2a00', color: '#fbbf24' },
  FAILED:      { bg: '#3a1a1a', color: '#f87171' },
  BLOCKED:     { bg: '#2a2540', color: '#9ca3af' },
}

const DEFAULT_STATUS_STYLE: StatusStyle = { bg: '#1a1a2a', color: '#6b7280' }

interface Props {
  story: Story
}

export function StoryDetailHero({ story }: Props) {
  const statusStyle = STATUS_STYLES[story.status] ?? DEFAULT_STATUS_STYLE

  return (
    <div style={{
      background: '#1a1730',
      borderRadius: '10px',
      padding: '16px 20px',
      border: '1px solid #2a2540',
    }}>
      {/* ID badge + title row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '12px',
      }}>
        {/* Story ID badge */}
        <span style={{
          background: '#2d1b4a',
          color: '#a78bfa',
          fontSize: '12px',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {story.id}
        </span>

        {/* Title */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#e6edf3',
          margin: 0,
          lineHeight: '1.3',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          flex: 1,
          minWidth: '200px',
        }}>
          {story.title}
        </h1>
      </div>

      {/* Status + model badges row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Status badge */}
        <span style={{
          background: statusStyle.bg,
          color: statusStyle.color,
          fontSize: '11px',
          fontWeight: 600,
          padding: '3px 9px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
        }}>
          {story.status}
        </span>

        {/* Model badge */}
        <span style={{
          background: '#2d1b4a',
          color: '#a78bfa',
          fontSize: '11px',
          fontWeight: 500,
          padding: '3px 9px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
        }}>
          {story.assignedModel}
        </span>
      </div>
    </div>
  )
}
