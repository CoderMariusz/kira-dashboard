'use client'

/**
 * components/eval/TaskDiffViewer.tsx
 * STORY-7.8 — Side-by-side diff viewer for eval task expected vs actual output.
 */

import { useState } from 'react'
import type { DiffLine } from '@/lib/eval/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskDiffViewerProps {
  diffLines: DiffLine[]
  expected_output: string
  actual_output: string
  /** Similarity score 0-100. */
  diffScore: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 90) return '#4ade80'
  if (score >= 70) return '#fbbf24'
  return '#f87171'
}

function scoreBg(score: number): string {
  if (score >= 90) return 'rgba(74,222,128,0.15)'
  if (score >= 70) return 'rgba(251,191,36,0.15)'
  return 'rgba(248,113,113,0.15)'
}

function lineStyle(type: DiffLine['type']): React.CSSProperties {
  switch (type) {
    case 'insert':
      return { background: 'rgba(52,211,153,0.2)', color: '#e6edf3' }
    case 'delete':
      return { background: 'rgba(248,113,113,0.2)', color: '#e6edf3' }
    default:
      return { color: '#9ca3af' }
  }
}

function linePrefix(type: DiffLine['type']): string {
  if (type === 'insert') return '+ '
  if (type === 'delete') return '- '
  return '  '
}

// ─── Diff pane ────────────────────────────────────────────────────────────────

const COLLAPSE_THRESHOLD = 20

interface DiffPaneProps {
  label: string
  bgColor: string
  content: string
  lines: DiffLine[]
  side: 'expected' | 'actual'
  collapsed: boolean
  onExpand: () => void
}

function DiffPane({ label, bgColor, content, lines, side, collapsed, onExpand }: DiffPaneProps) {
  const relevantLines = lines.filter(
    (l) =>
      l.type === 'equal' ||
      (side === 'expected' && l.type === 'delete') ||
      (side === 'actual' && l.type === 'insert'),
  )

  const displayLines = collapsed ? relevantLines.slice(0, COLLAPSE_THRESHOLD) : relevantLines
  const hasMore = relevantLines.length > COLLAPSE_THRESHOLD

  return (
    <div
      style={{
        flex: 1,
        background: bgColor,
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#e6edf3',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: '13px',
          lineHeight: 1.5,
          overflowX: 'auto',
          padding: '4px 0',
        }}
      >
        {lines.length === 0 ? (
          <pre
            style={{
              margin: 0,
              padding: '8px 12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: '#9ca3af',
            }}
          >
            {content || '(empty)'}
          </pre>
        ) : (
          <>
            {displayLines.map((line, i) => (
              <div
                key={i}
                style={{
                  ...lineStyle(
                    line.type === 'equal'
                      ? 'equal'
                      : side === 'expected'
                      ? 'delete'
                      : 'insert',
                  ),
                  padding: '1px 12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                <span style={{ userSelect: 'none', opacity: 0.5 }}>
                  {linePrefix(
                    line.type === 'equal'
                      ? 'equal'
                      : side === 'expected'
                      ? 'delete'
                      : 'insert',
                  )}
                </span>
                {line.value}
              </div>
            ))}
            {collapsed && hasMore && (
              <button
                onClick={onExpand}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 12px',
                  background: 'rgba(129,140,248,0.1)',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Poka\u017C wi\u0119cej ({relevantLines.length - COLLAPSE_THRESHOLD} wi\u0119cej linii)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaskDiffViewer({
  diffLines,
  expected_output,
  actual_output,
  diffScore,
}: TaskDiffViewerProps) {
  const [collapsed, setCollapsed] = useState(true)

  const scoreColorVal = scoreColor(diffScore)
  const scoreBgVal = scoreBg(diffScore)

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ marginBottom: '8px' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '8px',
            background: scoreBgVal,
            color: scoreColorVal,
          }}
        >
          Zgodno\u015B\u0107: {diffScore}%
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <DiffPane
            label="Oczekiwany output"
            bgColor="rgba(52,211,153,0.1)"
            content={expected_output}
            lines={diffLines}
            side="expected"
            collapsed={collapsed}
            onExpand={() => setCollapsed(false)}
          />
        </div>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <DiffPane
            label="Faktyczny output"
            bgColor="rgba(248,113,113,0.1)"
            content={actual_output}
            lines={diffLines}
            side="actual"
            collapsed={collapsed}
            onExpand={() => setCollapsed(false)}
          />
        </div>
      </div>
    </div>
  )
}
