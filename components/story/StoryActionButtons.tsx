'use client'

// components/story/StoryActionButtons.tsx
// Przyciski akcji story (start/advance/retry) widoczne warunkowe per status.
// Implementacja STORY-2.6.

import type { Story } from '@/types/story.types'

interface Props {
  story: Story
  startStory: (id: string) => Promise<void>
  advanceStory: (id: string, status: string) => Promise<void>
  loading: boolean
  error: string | null
}

export function StoryActionButtons({ story, startStory, advanceStory, loading }: Props) {
  const { id, status } = story

  const primaryStyle: React.CSSProperties = {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    boxShadow: '0 2px 10px rgba(124, 58, 237, 0.35)',
  }

  const secondaryStyle: React.CSSProperties = {
    padding: '8px 20px',
    background: '#2a2540',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
  }

  const hasAction = status === 'READY' || status === 'IN_PROGRESS' || status === 'FAILED'

  if (!hasAction) {
    return null
  }

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
      {status === 'READY' && (
        <button
          style={primaryStyle}
          disabled={loading}
          onClick={() => { void startStory(id) }}
          aria-label="Start Story"
        >
          {loading ? '...' : '▶ Start Story'}
        </button>
      )}

      {status === 'IN_PROGRESS' && (
        <button
          style={primaryStyle}
          disabled={loading}
          onClick={() => { void advanceStory(id, 'REVIEW') }}
          aria-label="Advance to Review"
        >
          {loading ? '...' : '→ Advance to Review'}
        </button>
      )}

      {status === 'FAILED' && (
        <button
          style={secondaryStyle}
          disabled={loading}
          onClick={() => { void startStory(id) }}
          aria-label="Retry Story"
        >
          {loading ? '...' : '↩ Retry'}
        </button>
      )}
    </div>
  )
}
