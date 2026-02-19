'use client'

// components/overview/StoryDetailModal.tsx
// Modal overlay showing run history for a specific model agent.
// Closes on: overlay click, ✕ button, or Escape key.

import { useEffect } from 'react'
import type { Run } from '@/types/bridge'
import type { ModelConfig } from './ModelCard'

interface StoryDetailModalProps {
  isOpen: boolean
  onClose: () => void
  modelConfig: ModelConfig
  runs: Run[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  DONE:        { bg: '#1a3a1a', color: '#4ade80' },
  REFACTOR:    { bg: '#3a2a00', color: '#fbbf24' },
  IN_PROGRESS: { bg: '#1a3a5c', color: '#60a5fa' },
  REVIEW:      { bg: '#2d1b4a', color: '#a78bfa' },
  MERGE:       { bg: '#1a2a1a', color: '#34d399' },
}

export default function StoryDetailModal({
  isOpen,
  onClose,
  modelConfig,
  runs,
}: StoryDetailModalProps) {
  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Last 10 runs sorted DESC (newest first)
  const last10 = [...runs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)

  const totalRuns = runs.length
  const doneRuns = runs.filter((r) => r.status === 'DONE').length
  const successRate =
    totalRuns > 0 ? `${((doneRuns / totalRuns) * 100).toFixed(1)}%` : '—'

  const validDurations = runs.filter((r) => r.duration_seconds !== null)
  const avgDuration =
    validDurations.length > 0
      ? `${(
          validDurations.reduce((s, r) => s + (r.duration_seconds ?? 0), 0) /
          validDurations.length /
          60
        ).toFixed(1)}m`
      : '—'

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Modal container — stopPropagation prevents overlay close on inner click */}
        <div
          style={{
            background: '#1a1730',
            border: '1px solid #3b3d7a',
            borderRadius: '14px',
            width: '540px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,.6)',
            animation: 'fadeUp 0.2s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div
            style={{
              padding: '18px 20px 12px',
              borderBottom: '1px solid #2a2540',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                background: '#2d1b4a',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}
              >
                {modelConfig.name} — {modelConfig.role}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#818cf8',
                  marginTop: '2px',
                }}
              >
                model: {modelConfig.key} · {totalRuns} runs · {successRate} success · avg{' '}
                {avgDuration}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                marginLeft: 'auto',
                width: '28px',
                height: '28px',
                background: '#2a2540',
                border: 'none',
                borderRadius: '7px',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div style={{ padding: '16px 20px' }}>
            {/* Metadata grid */}
            <div style={{ marginBottom: '16px' }}>
              <h4
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#4b4569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: '8px',
                  margin: '0 0 8px 0',
                }}
              >
                Metadata
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}
              >
                {[
                  { label: 'Model', value: modelConfig.key },
                  { label: 'Runs', value: String(totalRuns) },
                  { label: 'Success Rate', value: successRate },
                  { label: 'Avg Duration', value: avgDuration },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: '#13111c',
                      borderRadius: '7px',
                      padding: '8px 11px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#4b4569',
                        marginBottom: '2px',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#e6edf3',
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Runs */}
            <div>
              <h4
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#4b4569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  margin: '0 0 8px 0',
                }}
              >
                Recent Runs (last 10)
              </h4>
              {last10.length === 0 ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#4b4569',
                    padding: '16px',
                    textAlign: 'center',
                  }}
                >
                  Brak runów dla tego modelu
                </div>
              ) : (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  {last10.map((run) => {
                    const st =
                        STATUS_STYLES[run.status] ?? { bg: '#1a3a1a', color: '#4ade80' }
                    return (
                      <div
                        key={run.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          background: '#13111c',
                          borderRadius: '7px',
                          padding: '8px 11px',
                        }}
                      >
                        {/* Step */}
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#818cf8',
                            width: '70px',
                            flexShrink: 0,
                          }}
                        >
                          {run.step}
                        </div>
                        {/* Story info */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            flex: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {run.story_id}{run.story_title ? ` · ${run.story_title}` : ''}
                        </div>
                        {/* Duration */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            width: '44px',
                            textAlign: 'right',
                            flexShrink: 0,
                          }}
                        >
                          {run.duration_seconds !== null
                            ? `${(run.duration_seconds / 60).toFixed(1)}m`
                            : '—'}
                        </div>
                        {/* Status badge */}
                        <div
                          style={{
                            fontSize: '10px',
                            padding: '2px 7px',
                            borderRadius: '7px',
                            fontWeight: 600,
                            background: st.bg,
                            color: st.color,
                            flexShrink: 0,
                          }}
                        >
                          {run.status}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <div
            style={{
              padding: '12px 20px 16px',
              borderTop: '1px solid #2a2540',
              display: 'flex',
              gap: '9px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '7px 18px',
                background: '#2a2540',
                color: '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            <button
              style={{
                padding: '7px 18px',
                background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View Full Story →
            </button>
          </div>
        </div>
      </div>

      {/* fadeUp keyframes — injected inline so no global CSS required */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
