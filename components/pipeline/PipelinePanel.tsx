'use client'

// components/pipeline/PipelinePanel.tsx
// Left/top card: Active Stories, Review Queue, Blocked, Done Today sections.
// v2 (STORY-2.7): FilterBar + search/filter + live SSE updates + optimistic UI.
// v3 (STORY-6.8): Bulk selection + BulkActionBar.

import React, { useMemo, useState, useCallback } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import type { Story } from '@/types/bridge'
import type { LiveStory } from '@/hooks/useLivePipeline'
import type { PipelineFilters } from '@/hooks/usePipelineFilters'
import type { Project } from '@/types/bridge'
import type { BulkActionRequest, BulkActionResponse } from '@/types/pipeline-prd'
import PipelineRow from './PipelineRow'
import BulkActionBar from './BulkActionBar'
import { FilterBar } from './FilterBar'
import { PipelineEmptyState } from './PipelineEmptyState'

/** SWR key for pipeline data — must match usePipeline hook */
const PIPELINE_SWR_KEY = '/api/status/pipeline'

interface PipelinePanelProps {
  stories: Story[] | null
  isLoading: boolean
  isOffline: boolean
  onStoryClick: (story: Story) => void
  // STORY-2.7 additions
  filters: PipelineFilters
  onFilterChange: (filters: Partial<PipelineFilters>) => void
  onResetFilters: () => void
  projects: Project[]
  onStartStory?: (storyId: string) => Promise<void>
  sseConnected?: boolean
  sseError?: string | null
  /** STORY-12.13: true when Supabase Realtime WebSocket is SUBSCRIBED */
  realtimeConnected?: boolean
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '10px',
        fontWeight: 700,
        color: '#3d3757',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: '7px',
        marginTop: '10px',
      }}
    >
      {children}
    </div>
  )
}

/** Sprawdza czy story pasuje do aktywnych filtrów (addytywne AND) */
function matchesFilters(story: Story, filters: PipelineFilters): boolean {
  // Status filter
  if (filters.status && story.status !== filters.status) return false

  // Model filter (używa assigned_model z Story type)
  if (filters.model && story.assigned_model !== filters.model) return false

  // Project filter (używa opcjonalnego pola project które Bridge może zwracać)
  if (filters.project) {
    const storyProject = (story as Story & { project?: string }).project
    if (!storyProject || storyProject !== filters.project) return false
  }

  // Search filter (po id i title, case-insensitive) - AC-2
  if (filters.search) {
    const q = filters.search.toLowerCase()
    const matchesId = story.id.toLowerCase().includes(q)
    const matchesTitle = story.title.toLowerCase().includes(q)
    if (!matchesId && !matchesTitle) return false
  }

  return true
}

export default function PipelinePanel({
  stories,
  isLoading,
  isOffline,
  onStoryClick,
  filters,
  onFilterChange,
  onResetFilters,
  projects,
  onStartStory,
  sseConnected = true,
  sseError,
  realtimeConnected = false,
}: PipelinePanelProps) {
  // Filtruj stories addytywnie na podstawie aktywnych filtrów (AC-2, AC-3, AC-4)
  const filteredStories = useMemo<Story[]>(() => {
    if (!stories) return []
    return stories.filter((story) => matchesFilters(story, filters))
  }, [stories, filters])

  // ─── STORY-6.8: Bulk selection state ─────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  const { mutate } = useSWRConfig()

  const isSelecting = selectedIds.size > 0

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredStories.map((s) => s.id)))
  }, [filteredStories])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkAction = useCallback(async (actionReq: BulkActionRequest) => {
    setIsBulkLoading(true)
    try {
      const res = await fetch('/api/stories/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionReq),
      })

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(`Błąd serwera: ${errData.error ?? res.statusText}`)
        return
      }

      const data = (await res.json()) as BulkActionResponse
      const total = actionReq.story_ids.length

      if (data.failure_count === 0) {
        // Full success
        const label =
          actionReq.action === 'advance'
            ? `do ${actionReq.payload?.status ?? ''}`
            : `do modelu ${actionReq.payload?.model ?? ''}`
        toast.success(`${data.success_count}/${total} stories przesunięte ${label}`)
      } else {
        // Partial success — show details
        const errors = data.results
          .filter((r) => !r.success)
          .map((r) => `${r.id} — ${r.error ?? 'błąd'}`)
          .join('; ')
        toast.warning(
          `${data.success_count}/${total} sukces, ${data.failure_count} błąd: ${errors}`
        )
      }

      clearSelection()
      await mutate(PIPELINE_SWR_KEY)
    } catch (err) {
      toast.error(`Błąd serwera: ${err instanceof Error ? err.message : 'Nieznany błąd'}`)
    } finally {
      setIsBulkLoading(false)
    }
  }, [clearSelection, mutate])
  // ─────────────────────────────────────────────────────────────────────────────

  // Klasyfikuj stories na sekcje (po filtrowaniu)
  const todayStr = new Date().toISOString().slice(0, 10)

  const activeStories = filteredStories.filter((s) => s.status === 'IN_PROGRESS')
  const reviewStories = filteredStories.filter((s) => s.status === 'REVIEW')
  const refactorStories = filteredStories.filter((s) => s.status === 'REFACTOR')
  const blockedStories = filteredStories.filter((s) => s.status === 'BLOCKED')
  const mergeStories = filteredStories.filter((s) => s.status === 'MERGE')
  const doneTodayStories = filteredStories.filter(
    (s) => s.status === 'DONE' && s.updated_at.slice(0, 10) === todayStr
  )

  // Całkowita liczba stories po filtrze
  const hasAnyFiltered = filteredStories.length > 0
  const hasAnyFilter =
    Boolean(filters.status) ||
    Boolean(filters.model) ||
    Boolean(filters.project) ||
    Boolean(filters.search)

  return (
    <div
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '12px',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', margin: 0 }}
        >
          Pipeline
        </h3>
        <span style={{ fontSize: '11px', color: '#4b4569' }}>
          — active + merge queue
        </span>

        {/* Live update indicator — STORY-12.13 */}
        {/* Priority: Realtime > SSE > Polling */}
        {realtimeConnected ? (
          <span
            style={{
              fontSize: '10px',
              color: '#4ade80',
              marginLeft: 'auto',
            }}
            title="Supabase Realtime WebSocket aktywny"
          >
            🟢 Live (Realtime)
          </span>
        ) : sseConnected ? (
          <span
            style={{
              fontSize: '10px',
              color: '#86efac',
              marginLeft: 'auto',
            }}
            title="SSE połączone"
          >
            🟢 Live (SSE)
          </span>
        ) : (
          <span
            style={{
              fontSize: '10px',
              color: '#f87171',
              marginLeft: 'auto',
            }}
            title={sseError ?? 'Live updates offline — polling fallback active'}
          >
            🔴 Polling
          </span>
        )}
      </div>

      {/* SSE offline banner (EC-1) */}
      {isOffline && (
        <div
          style={{
            background: '#3a2a00',
            color: '#fbbf24',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '12px',
            fontSize: '12px',
          }}
        >
          Bridge API niedostępny — dane mogą być nieaktualne
        </div>
      )}

      {/* FilterBar — AC-1: Renderuje się nad listą stories */}
      <FilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        projects={projects}
      />

      {/* Licznik wyników dla screen readerów — ARIA */}
      <span
        aria-live="polite"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
        }}
      >
        {filteredStories.length} stories
      </span>

      {/* Loading state */}
      {!isOffline && isLoading && (
        <>
          <div
            style={{
              height: '60px',
              background: '#2a2540',
              borderRadius: '8px',
              marginBottom: '8px',
              opacity: 0.5,
            }}
          />
          <div
            style={{
              height: '40px',
              background: '#2a2540',
              borderRadius: '8px',
              opacity: 0.3,
            }}
          />
        </>
      )}

      {/* Loaded state */}
      {!isLoading && (() => {
        const safeStories = stories ?? []

        // Nie ma żadnych danych w ogóle (nie offline, ale brak stories)
        if (safeStories.length === 0 && !isOffline) {
          return (
            <div
              style={{
                background: '#13111c',
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center',
                color: '#3d3757',
                fontSize: '12px',
                marginBottom: '10px',
              }}
            >
              🎉 Pipeline idle — all stories done
            </div>
          )
        }

        // Empty state — filtry aktywne ale 0 wyników (AC-8)
        if (hasAnyFilter && !hasAnyFiltered && safeStories.length > 0) {
          return <PipelineEmptyState onReset={onResetFilters} />
        }

        return (
          <>
            {/* Summary counts — aktualizują się po filtrowaniu (AC-9) */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Active:{' '}
                <b style={{ color: '#60a5fa' }}>{activeStories.length}</b>
              </span>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Review:{' '}
                <b style={{ color: '#a78bfa' }}>{reviewStories.length}</b>
              </span>
              {blockedStories.length > 0 && (
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  Blocked:{' '}
                  <b style={{ color: '#f87171' }}>{blockedStories.length}</b>
                </span>
              )}
              {doneTodayStories.length > 0 && (
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  Done today:{' '}
                  <b style={{ color: '#4ade80' }}>{doneTodayStories.length}</b>
                </span>
              )}
            </div>

            {/* Active stories (IN_PROGRESS) — AC-9: nagłówek z licznikiem */}
            {activeStories.length === 0 && !hasAnyFilter ? (
              <div
                style={{
                  background: '#13111c',
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                  color: '#3d3757',
                  fontSize: '12px',
                  marginBottom: '10px',
                }}
              >
                🎉 Pipeline idle — all stories done
              </div>
            ) : activeStories.length > 0 ? (
              <>
                <SectionLabel>ACTIVE ({activeStories.length})</SectionLabel>
                {activeStories.map((story) => (
                  <PipelineRow
                    key={story.id}
                    story={story}
                    onClick={() => onStoryClick(story)}
                    justUpdated={(story as LiveStory)._justUpdated}
                    isOptimistic={(story as LiveStory)._isOptimistic}
                    onStart={
                      onStartStory
                        ? () => onStartStory(story.id)
                        : undefined
                    }
                    isSelected={selectedIds.has(story.id)}
                    onToggleSelect={toggleSelect}
                    showCheckbox={isSelecting}
                  />
                ))}
              </>
            ) : null}

            {/* Review queue — AC-9 */}
            {reviewStories.length > 0 && (
              <>
                <SectionLabel>REVIEW QUEUE ({reviewStories.length})</SectionLabel>
                {reviewStories.map((story) => (
                  <PipelineRow
                    key={story.id}
                    story={story}
                    onClick={() => onStoryClick(story)}
                    justUpdated={(story as LiveStory)._justUpdated}
                    isOptimistic={(story as LiveStory)._isOptimistic}
                    isSelected={selectedIds.has(story.id)}
                    onToggleSelect={toggleSelect}
                    showCheckbox={isSelecting}
                  />
                ))}
              </>
            )}

            {/* Refactor queue */}
            {refactorStories.length > 0 && (
              <>
                <SectionLabel>REFACTOR ({refactorStories.length})</SectionLabel>
                {refactorStories.map((story) => (
                  <PipelineRow
                    key={story.id}
                    story={story}
                    onClick={() => onStoryClick(story)}
                    justUpdated={(story as LiveStory)._justUpdated}
                    isSelected={selectedIds.has(story.id)}
                    onToggleSelect={toggleSelect}
                    showCheckbox={isSelecting}
                  />
                ))}
              </>
            )}

            {/* Blocked stories */}
            {blockedStories.length > 0 && (
              <>
                <SectionLabel>BLOCKED ({blockedStories.length})</SectionLabel>
                {blockedStories.map((story) => (
                  <PipelineRow
                    key={story.id}
                    story={story}
                    onClick={() => onStoryClick(story)}
                    justUpdated={(story as LiveStory)._justUpdated}
                    isSelected={selectedIds.has(story.id)}
                    onToggleSelect={toggleSelect}
                    showCheckbox={isSelecting}
                  />
                ))}
              </>
            )}

            {/* Merge queue */}
            {mergeStories.length > 0 && (
              <>
                <SectionLabel>MERGE QUEUE ({mergeStories.length})</SectionLabel>
                {mergeStories.map((story) => (
                  <PipelineRow
                    key={story.id}
                    story={story}
                    onClick={() => onStoryClick(story)}
                    justUpdated={(story as LiveStory)._justUpdated}
                    isSelected={selectedIds.has(story.id)}
                    onToggleSelect={toggleSelect}
                    showCheckbox={isSelecting}
                  />
                ))}
              </>
            )}

            {/* Done today — AC-9 */}
            {doneTodayStories.length > 0 && (
              <>
                <SectionLabel>DONE TODAY ({doneTodayStories.length})</SectionLabel>
                {doneTodayStories.map((story) => (
                  <PipelineRow
                    key={story.id}
                    story={story}
                    onClick={() => onStoryClick(story)}
                    justUpdated={(story as LiveStory)._justUpdated}
                    isSelected={selectedIds.has(story.id)}
                    onToggleSelect={toggleSelect}
                    showCheckbox={isSelecting}
                  />
                ))}
              </>
            )}

            {/* Empty state gdy filtry aktywne i sekcje są puste (AC-9) */}
            {hasAnyFilter && filteredStories.length === 0 && (
              <PipelineEmptyState onReset={onResetFilters} />
            )}
          </>
        )
      })()}

      {/* STORY-6.8: BulkActionBar — AC-3: slide-up when selectedIds.size > 0 */}
      {isSelecting && (
        <BulkActionBar
          selectedIds={Array.from(selectedIds)}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkAction={handleBulkAction}
          isLoading={isBulkLoading}
        />
      )}
    </div>
  )
}
