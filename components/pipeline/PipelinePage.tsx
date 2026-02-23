'use client'

// components/pipeline/PipelinePage.tsx
// Main container for the Pipeline tab (?tab=pipeline).
// v2 (STORY-2.7): Live SSE updates, FilterBar, search/filter, optimistic UI.
// Two-panel layout: PipelinePanel (left) + ActivityFeed (right).

import { useState, useCallback, Suspense } from 'react'
import { useLivePipeline } from '@/hooks/useLivePipeline'
import { usePipelineFilters } from '@/hooks/usePipelineFilters'
import { useProjects } from '@/hooks/useProjects'
import { useRuns } from '@/hooks/useRuns'
import { toast } from 'sonner'
import PipelinePanel from './PipelinePanel'
import ActivityFeed from './ActivityFeed'
import PipelineStoryModal from './PipelineStoryModal'
import OfflineBanner from './OfflineBanner'
import type { Story } from '@/types/bridge'

/**
 * Inner component that uses useSearchParams (requires Suspense boundary).
 * Handles all pipeline logic including live updates and filtering.
 */
function PipelinePageInner() {
  const {
    stories,
    loading: pipelineLoading,
    offline: pipelineOffline,
    sseConnected,
    sseError,
    startStory,
    isOfflineMode,
    syncedAt,
  } = useLivePipeline()

  const { filters, setFilters, resetFilters } = usePipelineFilters()
  const { projects } = useProjects()

  const {
    runs,
    loading: runsLoading,
    offline: runsOffline,
  } = useRuns()

  const [selectedStory, setSelectedStory] = useState<Story | null>(null)

  const handleRefresh = useCallback(() => {
    // SWR handles auto-refresh via refreshInterval: 30000 in useRuns hook
  }, [])

  const handleStoryClick = useCallback((story: Story) => {
    setSelectedStory(story)
  }, [])

  const handleModalClose = useCallback(() => {
    setSelectedStory(null)
  }, [])

  // AC-7: Obsługa startStory z toast sukcesu/błędu
  const handleStartStory = useCallback(
    async (storyId: string) => {
      try {
        await startStory(storyId)
        toast.success(`Story ${storyId} wystartowana`)
      } catch (err) {
        toast.error(
          `Nie udało się wystartować story: ${err instanceof Error ? err.message : 'Nieznany błąd'}`
        )
      }
    },
    [startStory]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* AC-10: Offline Mode banner — shows when Bridge is unavailable and data comes from Supabase */}
      {isOfflineMode && <OfflineBanner syncedAt={syncedAt} />}

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Left panel: active stories + queues + FilterBar */}
      <PipelinePanel
        stories={stories}
        isLoading={pipelineLoading}
        isOffline={pipelineOffline}
        onStoryClick={handleStoryClick}
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={resetFilters}
        projects={projects ?? []}
        onStartStory={handleStartStory}
        sseConnected={sseConnected}
        sseError={sseError}
      />

      {/* Right panel: activity feed */}
      <ActivityFeed
        runs={runs}
        isLoading={runsLoading}
        isOffline={runsOffline}
        onRefresh={handleRefresh}
      />

      {/* Story detail modal */}
      {selectedStory !== null && (
        <PipelineStoryModal
          isOpen={true}
          story={selectedStory}
          runs={runs ?? []}
          onClose={handleModalClose}
        />
      )}
    </div>
    </div>
  )
}

/**
 * PipelinePage wraps PipelinePageInner in Suspense because usePipelineFilters
 * uses useSearchParams() which requires a Suspense boundary in Next.js App Router.
 */
export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            height: '100%',
          }}
        >
          <div
            style={{
              background: '#1a1730',
              border: '1px solid #2a2540',
              borderRadius: '10px',
              padding: '15px',
            }}
          >
            <div
              style={{
                height: '30px',
                background: '#2a2540',
                borderRadius: '8px',
                marginBottom: '8px',
                opacity: 0.5,
              }}
            />
            <div
              style={{
                height: '60px',
                background: '#2a2540',
                borderRadius: '8px',
                opacity: 0.3,
              }}
            />
          </div>
          <div
            style={{
              background: '#1a1730',
              border: '1px solid #2a2540',
              borderRadius: '10px',
              padding: '15px',
              opacity: 0.5,
            }}
          />
        </div>
      }
    >
      <PipelinePageInner />
    </Suspense>
  )
}
