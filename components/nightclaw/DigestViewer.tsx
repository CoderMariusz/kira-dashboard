'use client'
/**
 * components/nightclaw/DigestViewer.tsx
 * STORY-9.7 — Renders a NightClaw markdown digest with syntax highlighting.
 *
 * Props (all external — no internal hook calls, fully testable):
 *  - isLoading: boolean — show skeleton
 *  - markdown: string | undefined — raw markdown content from API
 *  - error: Error | undefined — show error state
 *  - date: string — YYYY-MM-DD, used in empty state message
 */
import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0d0c1a',
  card: '#1a1730',
  border: '#3b3d7a',
  accent: '#818cf8',
  text: '#e6edf3',
  muted: '#4b4569',
  error: '#ef4444',
  codeBg: '#13111c',
} as const

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DigestViewerProps {
  isLoading: boolean
  markdown: string | undefined
  error: Error | undefined
  date: string
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DigestSkeleton() {
  const lines = [100, 80, 90, 60, 100, 70, 85, 50]
  return (
    <div data-testid="digest-skeleton" style={{ padding: '8px 0' }}>
      {lines.map((w, i) => (
        <div
          key={i}
          style={{
            height: i % 4 === 0 ? '20px' : '14px',
            width: `${w}%`,
            background: COLORS.muted,
            borderRadius: '4px',
            marginBottom: i % 4 === 0 ? '16px' : '8px',
            opacity: 0.25,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}

// ─── Error ────────────────────────────────────────────────────────────────────

function DigestError({ error }: { error: Error }) {
  return (
    <div
      data-testid="digest-error"
      style={{
        padding: '24px',
        textAlign: 'center',
        color: COLORS.error,
        background: '#1f0a0a',
        border: `1px solid ${COLORS.error}`,
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '18px', marginBottom: '8px' }}>⚠️ Błąd ładowania digestu</div>
      <div style={{ fontSize: '13px', color: COLORS.muted }}>{error.message}</div>
    </div>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────

function DigestEmpty({ date }: { date: string }) {
  return (
    <div
      data-testid="digest-empty"
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: COLORS.muted,
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌙</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: COLORS.text, marginBottom: '6px' }}>
        Brak digestu dla {date}
      </div>
      <div style={{ fontSize: '13px' }}>
        NightClaw nie wygenerował digestu dla tej daty.
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DigestViewer({ isLoading, markdown, error, date }: DigestViewerProps) {
  if (isLoading) {
    return <DigestSkeleton />
  }

  if (error) {
    return <DigestError error={error} />
  }

  if (!markdown || markdown.trim() === '') {
    return <DigestEmpty date={date} />
  }

  return (
    <div
      data-testid="digest-content"
      style={{
        color: COLORS.text,
        lineHeight: 1.7,
        fontSize: '14px',
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '10px',
        padding: '24px',
      }}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: COLORS.accent,
              borderBottom: `1px solid ${COLORS.border}`,
              paddingBottom: '8px',
              marginBottom: '16px',
              marginTop: '24px',
            }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: COLORS.accent,
              marginBottom: '12px',
              marginTop: '20px',
            }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              color: COLORS.text,
              marginBottom: '8px',
              marginTop: '16px',
            }}>
              {children}
            </h3>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className?.startsWith('language-'))
            return isBlock
              ? <code className={className} style={{
                  display: 'block',
                  background: COLORS.codeBg,
                  borderRadius: '6px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  overflowX: 'auto',
                  lineHeight: '1.5',
                  color: '#c9d1d9',
                }}>
                  {children}
                </code>
              : <code style={{
                  background: COLORS.codeBg,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  color: COLORS.accent,
                }}>
                  {children}
                </code>
          },
          pre: ({ children }) => (
            <pre style={{
              background: COLORS.codeBg,
              borderRadius: '8px',
              padding: '0',
              margin: '16px 0',
              overflow: 'auto',
            }}>
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '16px 0' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th style={{
              border: `1px solid ${COLORS.border}`,
              padding: '8px 12px',
              background: COLORS.bg,
              color: COLORS.accent,
              fontWeight: 600,
              textAlign: 'left',
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{
              border: `1px solid ${COLORS.border}`,
              padding: '8px 12px',
              color: COLORS.text,
            }}>
              {children}
            </td>
          ),
          p: ({ children }) => <p style={{ marginBottom: '12px', color: COLORS.text }}>{children}</p>,
          li: ({ children }) => <li style={{ marginBottom: '4px', color: COLORS.text }}>{children}</li>,
          ul: ({ children }) => <ul style={{ paddingLeft: '20px', marginBottom: '12px', listStyleType: 'disc' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: '20px', marginBottom: '12px', listStyleType: 'decimal' }}>{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: `3px solid ${COLORS.accent}`,
              paddingLeft: '16px',
              margin: '12px 0',
              color: COLORS.muted,
              fontStyle: 'italic',
            }}>
              {children}
            </blockquote>
          ),
          hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${COLORS.border}`, margin: '20px 0' }} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

export default DigestViewer
