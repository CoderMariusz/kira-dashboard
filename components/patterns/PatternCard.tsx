'use client'

/**
 * components/patterns/PatternCard.tsx
 * STORY-8.5 — Individual pattern card component
 */

import { toast } from 'sonner'
import type { PatternCard as PatternCardType, PatternType } from '@/types/patterns'

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0d0c1a',
  card:      '#1a1730',
  border:    '#2a2540',
  accent:    '#818cf8',
  text:      '#e2e8f0',
  secondary: '#94a3b8',
} as const

// ─── PatternTypeBadge ─────────────────────────────────────────────────────────
function PatternTypeBadge({ type }: { type: PatternType }) {
  const isPattern = type === 'PATTERN'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        background: isPattern ? '#1e1b4b' : '#2d0a0a',
        color: isPattern ? '#818cf8' : '#f87171',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {isPattern ? '✅ PATTERN' : '❌ ANTI_PATTERN'}
    </span>
  )
}

// ─── TagPill ──────────────────────────────────────────────────────────────────
function TagPill({
  tag,
  active,
  onTagFilter,
}: {
  tag: string
  active: boolean
  onTagFilter: (tag: string) => void
}) {
  return (
    <button
      aria-pressed={active}
      onClick={() => onTagFilter(tag)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onTagFilter(tag)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '99px',
        fontSize: '11px',
        fontWeight: 500,
        cursor: 'pointer',
        border: `1px solid ${active ? C.accent : C.border}`,
        background: active ? C.accent : 'transparent',
        color: active ? '#fff' : C.secondary,
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      {tag}
    </button>
  )
}

// ─── PatternCard ──────────────────────────────────────────────────────────────
interface PatternCardProps {
  pattern: PatternCardType
  activeTag: string | null
  onTagFilter: (tag: string) => void
}

export function PatternCard({ pattern, activeTag, onTagFilter }: PatternCardProps) {
  const {
    text,
    type,
    category,
    model,
    domain,
    tags,
    related_stories,
    date,
    occurrences,
  } = pattern

  // Show max 5 tags, then "+N" badge
  const visibleTags = tags.slice(0, 5)
  const hiddenTagCount = tags.length > 5 ? tags.length - 5 : 0

  // Show model/domain line only if at least one is non-null
  const hasModelOrDomain = model !== null || domain !== null

  // Show footer only if date exists OR occurrences > 1
  const showFooter = date !== null || occurrences > 1

  async function handleCopyStory(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      toast.success('Skopiowano!')
    } catch {
      toast.error('Nie można skopiować')
    }
  }

  return (
    <article
      aria-label={`Wzorzec: ${text.slice(0, 50)}`}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = '#3b3d7a'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = C.border
      }}
    >
      {/* ── Top row: type badge + category ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <PatternTypeBadge type={type} />
        <span
          style={{
            fontSize: '11px',
            color: C.secondary,
            background: '#1e1b4b22',
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            padding: '2px 8px',
            fontWeight: 500,
          }}
        >
          {category}
        </span>
      </div>

      {/* ── Main text (line-clamp-3) ── */}
      <p
        title={text}
        style={{
          margin: 0,
          fontSize: '13px',
          color: C.text,
          lineHeight: '1.5',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {text}
      </p>

      {/* ── Model / Domain line ── */}
      {hasModelOrDomain && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          {model !== null && (
            <span
              style={{
                fontSize: '11px',
                color: C.secondary,
                background: '#2a2540',
                borderRadius: '6px',
                padding: '2px 7px',
              }}
            >
              {model}
            </span>
          )}
          {domain !== null && (
            <span
              style={{
                fontSize: '11px',
                color: C.secondary,
                background: '#2a2540',
                borderRadius: '6px',
                padding: '2px 7px',
              }}
            >
              {domain}
            </span>
          )}
        </div>
      )}

      {/* ── Tag pills ── */}
      {tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
          }}
        >
          {visibleTags.map((tag) => (
            <TagPill
              key={tag}
              tag={tag}
              active={activeTag === tag}
              onTagFilter={onTagFilter}
            />
          ))}
          {hiddenTagCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: 500,
                border: `1px solid ${C.border}`,
                color: C.secondary,
              }}
            >
              +{hiddenTagCount}
            </span>
          )}
        </div>
      )}

      {/* ── Related stories ── */}
      {related_stories.length > 0 && (
        <div style={{ fontSize: '12px', color: C.secondary }}>
          <span style={{ marginRight: '4px' }}>Powiązane:</span>
          {related_stories.map((id, i) => (
            <button
              key={id}
              onClick={() => handleCopyStory(id)}
              title={`Kliknij, aby skopiować ${id}`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.accent,
                fontSize: '12px',
                padding: '0',
                marginRight: i < related_stories.length - 1 ? '6px' : '0',
                textDecoration: 'underline',
                textDecorationColor: 'transparent',
                transition: 'text-decoration-color 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.textDecorationColor = C.accent
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.textDecorationColor = 'transparent'
              }}
            >
              {id}
            </button>
          ))}
        </div>
      )}

      {/* ── Footer: date + occurrences ── */}
      {showFooter && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: C.secondary,
            marginTop: 'auto',
          }}
        >
          <span>
            {date !== null ? `📅 ${date}` : ''}
          </span>
          {occurrences > 1 && (
            <span>{occurrences}×</span>
          )}
        </div>
      )}
    </article>
  )
}
