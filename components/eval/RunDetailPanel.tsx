'use client'

/**
 * components/eval/RunDetailPanel.tsx
 * STORY-7.8 — Detail panel showing task results + diff for a selected eval run.
 */

import { useState } from 'react'
import { useEvalRunDetail } from '@/lib/eval/services'
import TaskDiffViewer from './TaskDiffViewer'
import type { EvalTaskResult, EvalRunStatus } from '@/lib/eval/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface RunDetailPanelProps {
  runId: string
  /** Optional close handler — used by mobile overlay in EvalTab. */
  onClose?: () => void
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'errors' | 'fixed'

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'Wszystkie',
  errors: 'Tylko b\u0142\u0119dy',
  fixed: 'Naprawione',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POLISH_MONTHS = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paz', 'lis', 'gru',
]

function formatDate(iso: string): string {
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

function statusBadge(status: EvalRunStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case 'completed': return { label: 'PASSED', color: '#4ade80', bg: '#1a3a1a' }
    case 'failed':    return { label: 'FAILED', color: '#f87171', bg: '#3a1a1a' }
    case 'running':   return { label: 'RUNNING', color: '#818cf8', bg: '#1a1a3a' }
    case 'error':     return { label: 'ERROR', color: '#fbbf24', bg: '#3a2a1a' }
    default:          return { label: status, color: '#6b7280', bg: '#1a1730' }
  }
}

function truncate(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '\u2026'
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            padding: '12px',
            background: '#13111c',
            borderRadius: '8px',
            marginBottom: '6px',
          }}
        >
          <div style={{ width: '70%', height: '12px', background: '#2a2540', borderRadius: '3px', marginBottom: '6px' }} />
          <div style={{ width: '40%', height: '10px', background: '#2a2540', borderRadius: '3px' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: EvalTaskResult
}

function TaskRow({ task }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false)
  const isPass = task.status === 'pass'

  return (
    <div
      style={{
        borderRadius: '8px',
        border: '1px solid #2a2540',
        marginBottom: '6px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          width: '100%',
          padding: '10px 12px',
          background: '#13111c',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '6px',
            background: isPass ? '#1a3a1a' : '#3a1a1a',
            color: isPass ? '#4ade80' : '#f87171',
            flexShrink: 0,
            marginTop: '1px',
          }}
        >
          {isPass ? 'PASS' : 'FAIL'}
        </span>

        <span style={{ flex: 1, fontSize: '12px', color: '#e6edf3', lineHeight: 1.4 }}>
          {truncate(task.prompt)}
        </span>

        <span
          style={{
            fontSize: '10px',
            padding: '2px 7px',
            borderRadius: '8px',
            background: '#2a2540',
            color: '#818cf8',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {task.category}
        </span>

        <span style={{ fontSize: '12px', color: '#4b4569', flexShrink: 0, lineHeight: 1 }}>
          {expanded ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '12px', background: '#100e1a' }}>
          <TaskDiffViewer
            diffLines={task.diff_lines ?? []}
            expected_output={task.expected_output}
            actual_output={task.actual_output ?? ''}
            diffScore={task.diff_score}
          />
          {task.error && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#f87171',
                padding: '6px 10px',
                background: '#3a1a1a',
                borderRadius: '6px',
              }}
            >
              B\u0142\u0105d: {task.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RunDetailPanel({ runId, onClose }: RunDetailPanelProps) {
  const { run, taskResults, diff, isLoading } = useEvalRunDetail(runId)
  const [filter, setFilter] = useState<FilterTab>('all')

  const filteredTasks = taskResults.filter((t) => {
    if (filter === 'errors') return t.status === 'fail'
    if (filter === 'fixed') return t.status === 'pass' && diff?.has_previous
    return true
  })

  const badge = run ? statusBadge(run.status) : null
  const score = run?.overall_score ?? 0
  const scoreColor = score >= 90 ? '#4ade80' : score >= 70 ? '#fbbf24' : '#f87171'

  return (
    <section
      role="region"
      aria-label="Szczeg\u00F3\u0142y Runu"
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '15px',
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ marginBottom: '14px' }}>
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#e6edf3',
            margin: '0 0 6px 0',
          }}
        >
          Szczeg\u00F3\u0142y Runu
        </h3>

        {isLoading ? (
          <Skeleton />
        ) : run ? (
          <>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {formatDate(run.started_at)}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor }}>
                {score}% ({run.passed_count}/{run.task_count} passed)
              </span>
              {badge && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: badge.bg,
                    color: badge.color,
                  }}
                >
                  {badge.label}
                </span>
              )}
              <span style={{ fontSize: '11px', color: '#4b4569', marginLeft: 'auto' }}>
                {'\u23F1'} {formatDuration(run.started_at, run.finished_at)}
              </span>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                padding: '8px 12px',
                background: '#13111c',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              {diff?.has_previous ? (
                <>
                  <span style={{ color: '#34d399' }}>{'\u2191'} {diff.fixed} naprawione</span>
                  {' / '}
                  <span style={{ color: '#f87171' }}>{'\u2193'} {diff.new_failures} nowe b\u0142\u0119dy</span>
                  {' / '}
                  <span style={{ color: '#6b7280' }}>{diff.unchanged} bez zmian</span>
                </>
              ) : (
                'Brak poprzedniego runu do por\u00F3wnania'
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {(Object.keys(FILTER_LABELS) as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  aria-pressed={filter === tab}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    background: filter === tab ? '#818cf8' : '#2a2540',
                    color: filter === tab ? '#fff' : '#6b7280',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {FILTER_LABELS[tab]}
                  {tab === 'all' && ` (${taskResults.length})`}
                  {tab === 'errors' && ` (${taskResults.filter((t) => t.status === 'fail').length})`}
                </button>
              ))}
            </div>

            {filteredTasks.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#4b4569', textAlign: 'center', padding: '16px' }}>
                Brak wynik\u00F3w dla wybranego filtru.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))
            )}
          </>
        ) : (
          <div style={{ fontSize: '12px', color: '#f87171', padding: '12px' }}>
            Nie mo\u017Cna za\u0142adowa\u0107 szczeg\u00F3\u0142\u00F3w runu.
          </div>
        )}
      </div>
    </section>
  )
}
