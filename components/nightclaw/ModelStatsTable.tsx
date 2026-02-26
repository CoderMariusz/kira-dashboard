'use client'
/**
 * components/nightclaw/ModelStatsTable.tsx
 * STORY-9.8 — Model Performance Stats Table
 */

import { useNightClawDigest } from '@/hooks/useNightClawDigest'
import type { ModelStatEntry } from '@/types/nightclaw'

const COLORS = {
  card: '#1a1730',
  border: '#3b3d7a',
  accent: '#818cf8',
  text: '#e6edf3',
  muted: '#4b4569',
  ok: '#22c55e',
  error: '#ef4444',
  headerBg: '#13112a',
} as const

export default function ModelStatsTable() {
  const { data, isLoading, error } = useNightClawDigest()

  if (isLoading) {
    return (
      <div data-testid="model-stats-loading" style={{ padding: '24px 0' }}>
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '10px',
          padding: '20px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ height: '12px', width: '60%', background: COLORS.muted, borderRadius: '4px', opacity: 0.4 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="model-stats-error" style={{ padding: '16px 0', color: '#f87171', fontSize: '14px' }}>
        Błąd ładowania statystyk: {error.message}
      </div>
    )
  }

  const modelStats = data?.model_stats

  if (!modelStats || Object.keys(modelStats.models).length === 0) {
    return (
      <div
        data-testid="model-stats-empty"
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
        Brak statystyk modeli
      </div>
    )
  }

  const sortedModels: Array<[string, ModelStatEntry]> = Object.entries(modelStats.models)
    .sort(([, a], [, b]) => b.success_rate - a.success_rate)

  const cellStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '13px',
    color: COLORS.text,
    borderBottom: `1px solid ${COLORS.border}`,
    whiteSpace: 'nowrap',
  }

  const headerCellStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 700,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: COLORS.headerBg,
    borderBottom: `1px solid ${COLORS.border}`,
    whiteSpace: 'nowrap',
  }

  return (
    <div
      data-testid="model-stats-table"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Model</th>
            <th style={{ ...headerCellStyle, textAlign: 'center' }}>Stories OK</th>
            <th style={{ ...headerCellStyle, textAlign: 'center' }}>Stories Failed</th>
            <th style={{ ...headerCellStyle, textAlign: 'center' }}>Success Rate</th>
            <th style={{ ...headerCellStyle, textAlign: 'center' }}>Avg Duration</th>
          </tr>
        </thead>
        <tbody>
          {sortedModels.map(([modelName, stats]) => {
            const isBelow = stats.success_rate < 0.80
            const ratePercent = Math.round(stats.success_rate * 100)

            return (
              <tr
                key={modelName}
                data-testid={`model-row-${modelName}`}
              >
                <td style={{ ...cellStyle, fontFamily: 'monospace', fontWeight: 600, color: COLORS.accent }}>
                  {modelName}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center', color: COLORS.ok }}>
                  {stats.stories_completed}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center', color: stats.stories_failed > 0 ? COLORS.error : COLORS.text }}>
                  {stats.stories_failed}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <span style={{ marginRight: '6px' }}>
                    {ratePercent}%
                  </span>
                  {isBelow ? (
                    <span title="Poniżej progu (80%)" style={{ fontSize: '14px' }}>🔴</span>
                  ) : (
                    <span title="Powyżej progu" style={{ fontSize: '14px' }}>✅</span>
                  )}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center', color: COLORS.muted }}>
                  {stats.avg_duration_min} min
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
