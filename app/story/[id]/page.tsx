'use client'

// app/story/[id]/page.tsx
// Główna strona Story Detail /story/[id].
// Implementacja STORY-2.6.

import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'
import { useStory } from '@/hooks/useStory'
import { useStoryActions } from '@/hooks/useStoryActions'
import { toastError } from '@/lib/toast'
import { StorySkeleton } from '@/components/story/StorySkeleton'
import { StoryDetailHero } from '@/components/story/StoryDetailHero'
import { StoryMetadataGrid } from '@/components/story/StoryMetadataGrid'
import { StoryDodList } from '@/components/story/StoryDodList'
import { StoryRunsTimeline } from '@/components/story/StoryRunsTimeline'
import { StoryLessons } from '@/components/story/StoryLessons'
import { StoryActionButtons } from '@/components/story/StoryActionButtons'

export default function StoryDetailPage() {
  const params = useParams<{ id: string }>()
  const storyId = params.id

  const { story, isLoading, isNotFound, isOffline, refresh } = useStory(storyId)
  const { startStory, advanceStory, loading: actionLoading, error: actionError } = useStoryActions()

  // Inline 404 z ID story (not-found.tsx nie ma dostępu do params)
  if (isNotFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#13111c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#e2e8f0' }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
            Story {storyId} nie istnieje lub została usunięta.
          </p>
          <Link href="/dashboard?tab=pipeline" style={{ color: '#a78bfa' }}>← Wróć do Pipeline</Link>
        </div>
      </div>
    )
  }

  // Wyświetl toast błędu akcji
  useEffect(() => {
    if (actionError) {
      toastError(actionError)
    }
  }, [actionError])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#13111c',
      padding: '18px 20px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb navigation"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <Link href="/" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
            Home
          </Link>
          <span style={{ fontSize: '12px', color: '#4b4569' }}>›</span>
          <Link href="/" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
            Pipeline
          </Link>
          <span style={{ fontSize: '12px', color: '#4b4569' }}>›</span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {isLoading ? 'Loading...' : storyId}
          </span>
        </nav>

        {/* OFFLINE BANNER */}
        {isOffline && (
          <div style={{
            background: '#3a2a00',
            border: '1px solid #5a4a00',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '13px', color: '#fbbf24' }}>
              ⚠️ Brak połączenia — dane mogą być nieaktualne
            </span>
            <button
              onClick={refresh}
              style={{
                fontSize: '11px',
                color: '#fbbf24',
                background: 'transparent',
                border: '1px solid #5a4a00',
                borderRadius: '6px',
                padding: '3px 10px',
                cursor: 'pointer',
              }}
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {isLoading && <StorySkeleton />}

        {/* FILLED STATE — dane załadowane */}
        {!isLoading && story && (
          <>
            <StoryDetailHero story={story} />

            {/* Responsive 2-column layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginTop: '16px',
            }}>
              {/* Left column: Metadata + DoD */}
              <div>
                <StoryMetadataGrid story={story} />
                <div style={{ marginTop: '16px' }}>
                  <StoryDodList dod={story.dod} isDone={story.status === 'DONE'} />
                </div>
              </div>

              {/* Right column: Runs + Lessons */}
              <div>
                <StoryRunsTimeline runs={story.runs} />
                <div style={{ marginTop: '16px' }}>
                  <StoryLessons lessons={story.lessons ?? []} />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{
              marginTop: '20px',
              borderTop: '1px solid #2a2540',
              paddingTop: '16px',
            }}>
              <StoryActionButtons
                story={story}
                startStory={startStory}
                advanceStory={advanceStory}
                loading={actionLoading}
                error={actionError}
              />
            </div>
          </>
        )}

        {/* OFFLINE BEZ CACHE */}
        {isOffline && !story && !isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px', color: '#e6edf3' }}>
              Nie można załadować danych story
            </p>
            <p style={{ fontSize: '13px', marginBottom: '16px' }}>
              Sprawdź połączenie i spróbuj ponownie.
            </p>
            <button
              onClick={refresh}
              style={{
                padding: '8px 18px',
                background: '#2a2540',
                color: '#6b7280',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
