'use client'

// components/pipeline/ActivityItem.tsx
// Single event in the Activity Feed timeline.

import type { Run } from '@/types/bridge'

const DOT_COLORS: Record<string, string> = {
  DONE:        '#4ade80',
  REFACTOR:    '#f87171',
  REVIEW:      '#60a5fa',
  IN_PROGRESS: '#818cf8',
  MERGE:       '#34d399',
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1)   return 'przed chwilą'
  if (diffMin < 60)  return `${diffMin} min temu`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)    return `${diffH}h temu`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1)   return 'wczoraj'
  return `${diffD} dni temu`
}

interface ActivityItemProps {
  run: Run
  isLast: boolean
}

export default function ActivityItem({ run, isLast }: ActivityItemProps) {
  const dotColor = DOT_COLORS[run.status] ?? '#818cf8'
  const relTime = formatRelativeTime(run.created_at)

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '7px 0',
        borderBottom: isLast ? 'none' : '1px solid #1f1c2e',
        position: 'relative',
      }}
    >
      {/* Timeline column: dot + vertical line */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          paddingTop: '3px',
          width: '8px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
        {!isLast && (
          <div
            style={{
              width: '1px',
              background: '#2a2540',
              flex: 1,
              marginTop: '3px',
              minHeight: '10px',
            }}
          />
        )}
      </div>

      {/* Event body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: '#e6edf3', lineHeight: 1.4 }}>
          <span style={{ color: '#818cf8', fontWeight: 600 }}>
            {run.story_id}
          </span>
          {' '}advanced to {run.status} by {run.model}
        </div>
        <div style={{ fontSize: '10px', color: '#4b4569', marginTop: '1px' }}>
          {relTime}
          {run.step ? ` · ${run.step}` : ''}
          {run.duration_seconds !== null
            ? ` · ${(run.duration_seconds / 60).toFixed(1)}m`
            : ''}
        </div>
      </div>
    </div>
  )
}
