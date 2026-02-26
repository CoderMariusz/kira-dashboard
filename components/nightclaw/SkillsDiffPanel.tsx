'use client'
/**
 * components/nightclaw/SkillsDiffPanel.tsx
 * STORY-9.8 — Skills Diff Panel
 */

import { useNightClawSkillsDiff } from '@/hooks/useNightClawSkillsDiff'

const COLORS = {
  card: '#1a1730',
  border: '#3b3d7a',
  text: '#e6edf3',
  muted: '#4b4569',
  addedBg: '#166534',
  addedText: '#4ade80',
  removedBg: '#7f1d1d',
  removedText: '#f87171',
  contextText: '#94a3b8',
  headerText: '#c4b5fd',
} as const

interface DiffLineProps {
  line: string
}

function DiffLine({ line }: DiffLineProps) {
  if (line.startsWith('+') && !line.startsWith('+++')) {
    return (
      <div
        data-testid="diff-line-added"
        style={{
          background: COLORS.addedBg,
          color: COLORS.addedText,
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '1px 8px',
          whiteSpace: 'pre',
        }}
      >
        {line}
      </div>
    )
  }

  if (line.startsWith('-') && !line.startsWith('---')) {
    return (
      <div
        data-testid="diff-line-removed"
        style={{
          background: COLORS.removedBg,
          color: COLORS.removedText,
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '1px 8px',
          whiteSpace: 'pre',
        }}
      >
        {line}
      </div>
    )
  }

  if (line.startsWith('@@')) {
    return (
      <div
        data-testid="diff-line-header"
        style={{
          color: COLORS.headerText,
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '1px 8px',
          whiteSpace: 'pre',
          opacity: 0.8,
        }}
      >
        {line}
      </div>
    )
  }

  return (
    <div
      data-testid="diff-line-context"
      style={{
        color: COLORS.contextText,
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '1px 8px',
        whiteSpace: 'pre',
      }}
    >
      {line}
    </div>
  )
}

export default function SkillsDiffPanel() {
  const { data, isLoading, error } = useNightClawSkillsDiff()

  if (isLoading) {
    return (
      <div data-testid="skills-diff-loading" style={{ padding: '24px 0' }}>
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '10px',
          padding: '20px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ height: '12px', width: '40%', background: COLORS.muted, borderRadius: '4px', opacity: 0.4 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="skills-diff-error" style={{ padding: '16px 0', color: '#f87171', fontSize: '14px' }}>
        Błąd ładowania danych diff: {error.message}
      </div>
    )
  }

  if (!data || data.skills.length === 0) {
    return (
      <div
        data-testid="skills-diff-empty"
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          color: COLORS.muted,
          fontSize: '14px',
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '10px',
        }}
      >
        Brak zmian w skillach w tym runie ✓
      </div>
    )
  }

  return (
    <div data-testid="skills-diff-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {data.skills.map((skill, idx) => (
        <div
          key={skill.path}
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${COLORS.border}`,
          }}>
            <span style={{
              fontWeight: 600,
              fontSize: '14px',
              color: COLORS.text,
              fontFamily: 'monospace',
            }}>
              {skill.name}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span
                data-testid={`skill-badge-added-${idx}`}
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: COLORS.addedText,
                  background: COLORS.addedBg,
                }}
              >
                +{skill.lines_added}
              </span>
              <span
                data-testid={`skill-badge-removed-${idx}`}
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: COLORS.removedText,
                  background: COLORS.removedBg,
                }}
              >
                -{skill.lines_removed}
              </span>
            </div>
          </div>

          <div
            data-testid={`skill-diff-content-${idx}`}
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowX: 'auto',
            }}
          >
            {skill.diff.split('\n').map((line, lineIdx) => (
              <DiffLine key={lineIdx} line={line} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
