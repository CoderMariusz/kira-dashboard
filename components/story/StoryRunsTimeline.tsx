'use client'

// components/story/StoryRunsTimeline.tsx
// Chronologiczna lista runów story.
// Implementacja STORY-2.6.

import type { StoryRun } from '@/types/story.types'

interface Props {
  runs: StoryRun[]
}

interface RunStatusStyle {
  bg: string
  color: string
  label: string
}

const RUN_STATUS_STYLES: Record<'success' | 'failure' | 'in_progress', RunStatusStyle> = {
  success:     { bg: '#1a3a1a', color: '#4ade80', label: 'DONE' },
  failure:     { bg: '#3a1a1a', color: '#f87171', label: 'FAILED' },
  in_progress: { bg: '#1a3a5c', color: '#60a5fa', label: 'RUNNING' },
}

function formatDuration(duration: number | undefined): string {
  if (duration === undefined || duration === null) return '—'
  if (duration >= 60) {
    return `${Math.round(duration / 60 * 10) / 10}m`
  }
  return `${duration}s`
}

export function StoryRunsTimeline({ runs }: Props) {
  return (
    <div>
      <div style={{
        fontSize: '11px',
        color: '#4b4569',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '8px',
        fontWeight: 600,
      }}>
        Runs Timeline
      </div>

      {runs.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#3d3757', textAlign: 'center', padding: '16px 0' }}>
          Brak runów
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {runs.map((run) => {
            const statusStyle = RUN_STATUS_STYLES[run.status]

            return (
              <div
                key={run.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#13111c',
                  borderRadius: '7px',
                  padding: '8px 11px',
                }}
              >
                {/* Step */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#818cf8',
                  width: '70px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {run.step}
                </div>

                {/* Model */}
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {run.model}
                </div>

                {/* Duration */}
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  width: '44px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}>
                  {run.status === 'in_progress' ? 'trwa...' : formatDuration(run.duration)}
                </div>

                {/* Status badge */}
                {statusStyle && (
                  <div style={{
                    fontSize: '10px',
                    padding: '2px 7px',
                    borderRadius: '7px',
                    fontWeight: 600,
                    flexShrink: 0,
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    whiteSpace: 'nowrap',
                  }}>
                    {statusStyle.label}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
