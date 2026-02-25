'use client'
// components/nightclaw/DigestViewer.tsx — STORY-9.7
import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { useNightClawDigest } from '@/hooks/useNightClawDigest'

const COLORS = {
  card: '#1a1730',
  border: '#3b3d7a',
  accent: '#818cf8',
  text: '#e6edf3',
  muted: '#4b4569',
  error: '#ef4444',
  codeBg: '#13111c',
} as const

function todayISO(): string { return new Date().toISOString().slice(0, 10) }
function offsetDate(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

interface DigestViewerProps { initialDate?: string }

function DigestSkeleton() {
  return (
    <div data-testid="digest-skeleton" style={{ padding: '8px 0' }}>
      {[100, 80, 90, 60, 100, 70, 85, 50].map((w, i) => (
        <div
          key={i}
          style={{
            height: i % 4 === 0 ? '20px' : '14px',
            width: `${w}%`,
            background: COLORS.muted,
            borderRadius: '4px',
            marginBottom: i % 4 === 0 ? '16px' : '8px',
            opacity: 0.25,
          }}
        />
      ))}
    </div>
  )
}

export function DigestViewer({ initialDate }: DigestViewerProps) {
  const [date, setDate] = useState<string>(initialDate ?? todayISO())
  const { data, isLoading, error } = useNightClawDigest(date)

  return (
    <div data-testid="digest-viewer" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          data-testid="digest-prev-btn"
          onClick={() => setDate(d => offsetDate(d, -1))}
          aria-label="Poprzedni dzien"
          style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, cursor: 'pointer', fontSize: '13px' }}
        >
          Poprzedni
        </button>
        <input
          data-testid="digest-date-picker"
          type="date"
          value={date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.value) setDate(e.target.value) }}
          max={todayISO()}
          style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, fontSize: '13px' }}
        />
        <button
          data-testid="digest-next-btn"
          onClick={() => setDate(d => offsetDate(d, 1))}
          aria-label="Nastepny dzien"
          style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, cursor: 'pointer', fontSize: '13px' }}
        >
          Nastepny
        </button>
      </div>

      {isLoading && <DigestSkeleton />}

      {!isLoading && error && (
        <div
          data-testid="digest-error"
          style={{ padding: '24px', textAlign: 'center', color: COLORS.error, background: '#1f0a0a', border: `1px solid ${COLORS.error}`, borderRadius: '8px' }}
        >
          <div>Blad ladowania digestu</div>
          <div style={{ fontSize: '13px', color: COLORS.muted }}>{error.message}</div>
        </div>
      )}

      {!isLoading && !error && (!data?.markdown || data.markdown.trim() === '') && (
        <div
          data-testid="digest-empty"
          style={{ padding: '48px 24px', textAlign: 'center', color: COLORS.muted }}
        >
          <div style={{ fontSize: '16px', fontWeight: 600, color: COLORS.text, marginBottom: '6px' }}>
            Brak digestu dla {date}
          </div>
        </div>
      )}

      {!isLoading && !error && data?.markdown && data.markdown.trim() !== '' && (
        <div
          data-testid="digest-markdown-wrapper"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '24px', color: COLORS.text, lineHeight: '1.7', fontSize: '14px' }}
        >
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
            {data.markdown}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export default DigestViewer
