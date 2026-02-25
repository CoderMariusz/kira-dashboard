'use client'

/**
 * components/eval/RunHistoryTimeline.tsx
 * STORY-7.8 — Timeline of eval run history with delta badges.
 */

import { useState } from 'react'
import { useEvalRuns } from '@/lib/eval/services'
import type { EvalRun, EvalRunStatus } from '@/lib/eval/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface RunHistoryTimelineProps {
  selectedRunId: string | null
  onSelectRun: (runId: string) => void
  /** Optional enriched runs override from EvalTab (with delta populated). */
  runs?: EvalRun[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POLISH_MONTHS = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paz', 'lis', 'gru',
]

function formatRunDate(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const mon = POLISH_MONTHS[d.getMonth()]
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${day} ${mon}, ${hh}:${mm}`
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return '--'
  const diff = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  const mins = Math.floor(diff / 60)
  const secs = diff % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function statusIcon(status: EvalRunStatus): string {
  switch (status) {
    case 'completed': return '\u2705'
    case 'failed':    return '\u274C'
    case 'running':   return '\u23F3'
    case 'error':     return '\u26A0\uFE0F'
    default:          return '\u23F3'
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      className="animate-pulse"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        background: '#1a1730',
        marginBottom: '6px',
      }}
    >
      <div style={{ width: '20px', height: '20px', background: '#2a2540', borderRadius: '4px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ width: '60%', height: '11px', background: '#2a2540', borderRadius: '3px' }} />
        <div style={{ width: '40%', height: '10px', background: '#2a2540', borderRadius: '3px' }} />
      </div>
      <div style={{ width: '50px', height: '20px', background: '#2a2540', borderRadius: '6px' }} />
    </div>
  )
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ run }: { run: EvalRun }) {
  if (!run.delta?.has_previous) return null

  const { fixed, new_failures } = run.delta

  if (fixed === 0 && new_failures === 0) return null

  return (
    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
      {fixed > 0 && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '10px',
            background: 'rgba(52,211,153,0.15)',
            color: '#34d399',
            whiteSpace: 'nowrap',
          }}
        >
          {'\u2191'} {fixed} naprawionych
        </span>
      )}
      {new_failures > 0 && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '10px',
            background: 'rgba(248,113,113,0.15)',
            color: '#f87171',
            whiteSpace: 'nowrap',
          }}
        >
          {'\u2193'} {new_failures} nowych {'\u0142'}ed{'\u00F3'}w
        </span>
      )}
    </div>
  )
}

// ─── Run row ──────────────────────────────────────────────────────────────────

interface RunRowProps {
  run: EvalRun
  isSelected: boolean
  onClick: () => void
}

function RunRow({ run, isSelected, onClick }: RunRowProps) {
  const score = run.overall_score
  const scoreColor = score >= 90 ? '#4ade80' : score >= 70 ? '#fbbf24' : '#f87171'
  const passed = run.passed_count
  const total = run.task_count

  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        background: isSelected ? '#1e1a35' : '#13111c',
        border: `1px solid ${isSelected ? '#818cf8' : '#2a2540'}`,
        cursor: 'pointer',
        marginBottom: '6px',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <span style={{ fontSize: '14px', flexShrink: 0 }}>{statusIcon(run.status)}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: '#e6edf3', fontWeight: 500 }}>
          {formatRunDate(run.started_at)}
        </div>
        <div style={{ fontSize: '10px', color: '#4b4569', marginTop: '1px' }}>
          {formatDuration(run.started_at, run.finished_at)}
        </div>
      </div>

      <DeltaBadge run={run} />

      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: scoreColor }}>
          {score}%
        </div>
        <div style={{ fontSize: '10px', color: '#4b4569' }}>
          {passed}/{total} passed
        </div>
      </div>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RunHistoryTimeline({ selectedRunId, onSelectRun, runs: runsProp }: RunHistoryTimelineProps) {
  const [limit, setLimit] = useState(20)
  const { runs: fetchedRuns, hasMore, isLoading, mutate } = useEvalRuns(limit)
  // Use externally enriched runs (with delta populated) if provided; otherwise use fetched runs.
  const runs = runsProp ?? fetchedRuns

  return (
    <section
      role="region"
      aria-label="Historia Run\u00F3w"
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '15px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#e6edf3',
            margin: 0,
            flex: 1,
          }}
        >
          Historia Run{'\u00F3'}w
        </h3>
        <button
          onClick={() => mutate()}
          aria-label="Od\u015Bwie\u017C histori\u0119 run\u00F3w"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#4b4569',
            padding: '2px 4px',
          }}
        >
          {'\u21BA'}
        </button>
      </div>

      {isLoading ? (
        <>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </>
      ) : runs.length === 0 ? (
        <div
          style={{
            fontSize: '13px',
            color: '#4b4569',
            textAlign: 'center',
            padding: '24px 0',
          }}
        >
          Brak run{'\u00F3'}w eval. Uruchom pierwszy eval klikaj{'\u0105'}c &quot;Uruchom Eval&quot;.
        </div>
      ) : (
        <>
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              isSelected={run.id === selectedRunId}
              onClick={() => onSelectRun(run.id)}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => setLimit((l) => l + 20)}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '4px',
                background: 'none',
                border: '1px solid #2a2540',
                borderRadius: '8px',
                color: '#6b7280',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Za{'\u0142'}aduj wi\u0119cej
            </button>
          )}
        </>
      )}
    </section>
  )
}
