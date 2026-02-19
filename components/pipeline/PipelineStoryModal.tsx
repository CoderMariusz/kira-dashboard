'use client'

// components/pipeline/PipelineStoryModal.tsx
// Modal with full story details — metadata, recent runs.
// Closes on: overlay click, ✕ button, or Escape key.

import { useEffect } from 'react'
import type { Story, Run, StoryStatus, RunStatus } from '@/types/bridge'

type ModalStatusStyle = { bg: string; color: string; label: string }

const STATUS_STYLES: Record<StoryStatus | RunStatus, ModalStatusStyle> = {
  DONE:        { bg: '#1a3a1a', color: '#4ade80',  label: 'DONE' },
  IN_PROGRESS: { bg: '#1a3a5c', color: '#60a5fa',  label: 'IN PROGRESS' },
  REVIEW:      { bg: '#2d1b4a', color: '#a78bfa',  label: 'REVIEW' },
  REFACTOR:    { bg: '#3a2a00', color: '#fbbf24',  label: 'REFACTOR' },
  MERGE:       { bg: '#1a2a1a', color: '#34d399',  label: 'MERGE' },
  TODO:        { bg: '#1a1a2a', color: '#6b7280',  label: 'TODO' },
  BLOCKED:     { bg: '#3a1a1a', color: '#f87171',  label: 'BLOCKED' },
}

const DEFAULT_MODAL_STYLE: ModalStatusStyle = { bg: '#1a1a2a', color: '#6b7280', label: 'UNKNOWN' }

interface PipelineStoryModalProps {
  isOpen: boolean
  story: Story
  runs: Run[]
  onClose: () => void
}

export default function PipelineStoryModal({
  isOpen,
  story,
  runs,
  onClose,
}: PipelineStoryModalProps) {
  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const st: ModalStatusStyle = STATUS_STYLES[story.status] ?? DEFAULT_MODAL_STYLE

  // Format started_at date
  const startedDate = story.started_at
    ? new Date(story.started_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  // Last 10 runs for this story, DESC (newest first)
  const storyRuns = [...runs]
    .filter((r) => r.story_id === story.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)

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
        aria-modal="true"
        role="dialog"
        aria-label={`Details for ${story.id}`}
      >
        {/* Modal container */}
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
          {/* ── Header ──────────────────────────────────────────── */}
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
              🔧
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}
              >
                {story.title}
              </div>
              <div
                style={{ fontSize: '12px', color: '#818cf8', marginTop: '2px' }}
              >
                {story.id} · {story.epic}
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

          {/* ── Body ────────────────────────────────────────────── */}
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
                  {
                    label: 'Status',
                    value: (
                      <span style={{ color: st.color }}>{st.label}</span>
                    ),
                  },
                  {
                    label: 'Model',
                    value: story.assigned_model ?? '—',
                  },
                  {
                    label: 'Epic',
                    value: story.epic,
                  },
                  {
                    label: 'Started',
                    value: startedDate,
                  },
                  {
                    label: 'Domain',
                    value: story.domain ?? '—',
                  },
                  {
                    label: 'Difficulty',
                    value: story.difficulty ?? '—',
                  },
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
                        textTransform: 'capitalize',
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Definition of Done */}
            {story.definition_of_done && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Definition of Done</h4>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{story.definition_of_done}</p>
              </div>
            )}

            {/* Recent Runs for this story */}
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
                Recent Runs ({storyRuns.length})
              </h4>
              {storyRuns.length === 0 ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#4b4569',
                    padding: '12px',
                    textAlign: 'center',
                    background: '#13111c',
                    borderRadius: '8px',
                  }}
                >
                  Brak runów dla tej story
                </div>
              ) : (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  {storyRuns.map((run) => {
                    const rst: ModalStatusStyle =
                      STATUS_STYLES[run.status] ?? DEFAULT_MODAL_STYLE
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
                            width: '80px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {run.step}
                        </div>
                        {/* Model */}
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
                          {run.model}
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
                            flexShrink: 0,
                            background: rst.bg,
                            color: rst.color,
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

          {/* ── Footer ──────────────────────────────────────────── */}
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

      {/* fadeUp animation */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
