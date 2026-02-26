'use client'
/**
 * components/nightclaw/ResearchAccordion.tsx
 * STORY-9.8 — Research Findings Accordion
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useNightClawResearch } from '@/hooks/useNightClawResearch'

const COLORS = {
  card: '#1a1730',
  border: '#3b3d7a',
  accent: '#818cf8',
  text: '#e6edf3',
  muted: '#4b4569',
} as const

export default function ResearchAccordion() {
  const { data, isLoading, error } = useNightClawResearch()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div data-testid="research-loading" style={{ padding: '24px 0' }}>
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '10px',
          padding: '20px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ height: '12px', width: '50%', background: COLORS.muted, borderRadius: '4px', opacity: 0.4 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="research-error" style={{ padding: '16px 0', color: '#f87171', fontSize: '14px' }}>
        Błąd ładowania badań: {error.message}
      </div>
    )
  }

  if (!data || data.files.length === 0) {
    return (
      <div
        data-testid="research-empty"
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
        Brak plików badań
      </div>
    )
  }

  function handleToggle(idx: number) {
    setOpenIndex(prev => (prev === idx ? null : idx))
  }

  return (
    <div
      data-testid="research-accordion"
      style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
    >
      {data.files.map((file, idx) => {
        const isOpen = openIndex === idx

        return (
          <div
            key={file.filename}
            data-testid={`research-item-${idx}`}
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <button
              data-testid={`research-trigger-${idx}`}
              onClick={() => handleToggle(idx)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: COLORS.text,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                <span style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  color: COLORS.accent,
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {file.filename}
                </span>
                {!isOpen && file.preview && (
                  <span style={{
                    fontSize: '12px',
                    color: COLORS.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.preview.split('\n')[0]}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '16px',
                color: COLORS.muted,
                marginLeft: '12px',
                flexShrink: 0,
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}>
                ▼
              </span>
            </button>

            {isOpen && (
              <div
                data-testid={`research-content-${idx}`}
                style={{
                  padding: '16px',
                  borderTop: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                <ReactMarkdown>{file.content}</ReactMarkdown>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
