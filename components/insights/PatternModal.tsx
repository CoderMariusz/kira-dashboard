'use client'

// components/insights/PatternModal.tsx
// Modal z pełnym opisem klikniętego patternu.
// Implementowany jako shadcn/ui Dialog (AC-6).

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Pattern } from '@/types/insights'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPatternIcon(type: string): string {
  switch (type) {
    case 'PATTERN':
      return '🔵'
    case 'ANTI':
      return '🔴'
    case 'LESSON':
      return '🟣'
    default:
      return '⚪'
  }
}

function getPatternIconBg(type: string): string {
  switch (type) {
    case 'PATTERN':
      return '#1a3a5c'
    case 'ANTI':
      return '#3a1a1a'
    case 'LESSON':
      return '#2d1b4a'
    default:
      return '#2a2540'
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PatternModalProps {
  /** Pattern do wyświetlenia lub null (modal zamknięty). */
  pattern: Pattern | null
  /** Czy modal jest otwarty. */
  open: boolean
  /** Callback do zamknięcia modalu. */
  onClose: () => void
}

/**
 * Modal z pełnym opisem wzorca.
 * Zamyka się na: przycisk ✕, kliknięcie overlay, klawisz Escape (shadcn Dialog).
 */
export function PatternModal({ pattern, open, onClose }: PatternModalProps) {
  if (!pattern) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent
        style={{
          background: '#1a1730',
          border: '1px solid #3b3d7a',
          borderRadius: 14,
          width: 540,
          maxWidth: '95vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: 0,
        }}
        className="gap-0"
      >
        {/* Header */}
        <DialogHeader
          style={{
            padding: '18px 20px 12px',
            borderBottom: '1px solid #2a2540',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Icon */}
            <div
              style={{
                width: 32,
                height: 32,
                background: getPatternIconBg(pattern.type),
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}
              aria-hidden
            >
              {getPatternIcon(pattern.type)}
            </div>
            <div>
              <DialogTitle
                style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', margin: 0 }}
              >
                {pattern.topic}
              </DialogTitle>
              <div style={{ fontSize: 12, color: '#818cf8', marginTop: 2 }}>
                {pattern.type} · {pattern.occurrence_count} wystąpień
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* Opis */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#4b4569',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: 8,
              }}
            >
              Opis
            </div>
            <div
              style={{
                background: '#13111c',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                color: '#6b7280',
                lineHeight: 1.6,
              }}
            >
              {pattern.description || <em style={{ color: '#4b4569' }}>Brak opisu.</em>}
            </div>
          </div>

          {/* Statystyki */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#4b4569',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
                marginBottom: 8,
              }}
            >
              Statystyki
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <div style={{ background: '#13111c', borderRadius: 7, padding: '9px 11px' }}>
                <div style={{ fontSize: 10, color: '#4b4569', marginBottom: 3 }}>Typ</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e6edf3' }}>{pattern.type}</div>
              </div>
              <div style={{ background: '#13111c', borderRadius: 7, padding: '9px 11px' }}>
                <div style={{ fontSize: 10, color: '#4b4569', marginBottom: 3 }}>Wystąpienia</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e6edf3' }}>
                  {pattern.occurrence_count}×
                </div>
              </div>
            </div>
          </div>

          {/* Powiązane stories — ukryte gdy brak */}
          {pattern.related_stories && pattern.related_stories.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#4b4569',
                  textTransform: 'uppercase',
                  letterSpacing: '.07em',
                  marginBottom: 8,
                }}
              >
                Powiązane stories
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pattern.related_stories.map((story) => (
                  <span
                    key={story}
                    style={{
                      fontSize: 11,
                      color: '#818cf8',
                      background: '#1e1b4b',
                      borderRadius: 5,
                      padding: '2px 8px',
                    }}
                  >
                    {story}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
