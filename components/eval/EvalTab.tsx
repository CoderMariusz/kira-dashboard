'use client'

// components/eval/EvalTab.tsx
// Główny kontener zakładki Eval.
// Wywołuje hooki useEval() i useRuns(), przekazuje dane do paneli.
// STORY-7.8: dodano RunHistoryTimeline + RunDetailPanel pod istniejącymi panelami.

import { Suspense, useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { useEval } from '@/hooks/useEval'
import { useRuns } from '@/hooks/useRuns'
import { useEvalRuns, useEvalRunDetail } from '@/lib/eval/services'
import type { EvalRun } from '@/lib/eval/types'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import EvalFrameworkPanel from './EvalFrameworkPanel'
import CostTrackerPanel from './CostTrackerPanel'
import EvalInfoPanel from './EvalInfoPanel'
import RunHistoryTimeline from './RunHistoryTimeline'
import RunDetailPanel from './RunDetailPanel'

function EvalTabContent() {
  const {
    scores,
    overallScore,
    recentRuns,
    loading: evalLoading,
    offline: evalOffline,
  } = useEval()

  const { runs, loading: runsLoading } = useRuns()

  // STORY-7.8 — selected run state for history timeline + detail panel
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // Fetch run list for enriched delta propagation (SWR-deduplicated with RunHistoryTimeline)
  const { runs: rawRuns } = useEvalRuns(20)
  // Fetch detail for selected run to extract diff data
  const { diff } = useEvalRunDetail(selectedRunId)

  // AC-4: Enriched runs — delta badges populated from run detail (derived, no extra state)
  const enrichedRuns = useMemo<EvalRun[]>(() => {
    if (!rawRuns?.length) return []
    if (!diff || !selectedRunId) return rawRuns
    return rawRuns.map((r) =>
      r.id === selectedRunId
        ? {
            ...r,
            delta: {
              has_previous: diff.has_previous,
              fixed: diff.fixed,
              new_failures: diff.new_failures,
              unchanged: diff.unchanged,
            },
          }
        : r,
    )
  }, [rawRuns, diff, selectedRunId])

  const handleSelectRun = (runId: string) => {
    setSelectedRunId((prev) => (prev === runId ? null : runId))
  }

  return (
    <div
      style={{
        padding: '18px 20px',
        background: '#13111c',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header with title and help popover */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, margin: 0 }}>
          Eval
        </h1>
        <Popover>
          <PopoverTrigger asChild>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#818cf8',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Pomoc dotycząca Eval"
            >
              <CircleHelp size={18} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            style={{
              background: '#1a1730',
              border: '1px solid #2a2540',
              color: '#a0a0b8',
              fontSize: '13px',
              lineHeight: '1.6',
              maxWidth: '320px',
            }}
          >
            Golden Tasks to zadania testowe sprawdzające czy Kira odpowiada
            zgodnie z oczekiwaniami. Uruchom eval po każdej zmianie modelu.
          </PopoverContent>
        </Popover>
      </div>

      {/* Existing panels — DO NOT MODIFY */}
      <EvalInfoPanel />

      <EvalFrameworkPanel
        scores={scores}
        overallScore={overallScore}
        recentRuns={recentRuns}
        isLoading={evalLoading}
        isOffline={evalOffline}
      />
      <CostTrackerPanel runs={runs} isLoading={runsLoading} />

      {/* ── STORY-7.8: Run History section ───────────────────────────────── */}
      {/* Responsive layout:
          Desktop (≥1024px): RunHistoryTimeline 300px left, RunDetailPanel flex-1 right
          Tablet (≥768px):   stacked vertically
          Mobile (<768px):   only timeline; click → modal overlay (handled by RunDetailPanel) */}
      <style>{`
        .rh-layout {
          display: flex;
          flex-direction: row;
          gap: 16px;
          align-items: flex-start;
          width: 100%;
        }
        .rh-timeline {
          width: 300px;
          flex-shrink: 0;
        }
        .rh-detail {
          flex: 1;
          min-width: 0;
        }
        .rh-mobile-overlay {
          display: none;
        }
        @media (max-width: 1023px) and (min-width: 768px) {
          .rh-layout { flex-direction: column; }
          .rh-timeline { width: 100%; }
        }
        @media (max-width: 767px) {
          .rh-layout { flex-direction: column; }
          .rh-timeline { width: 100%; }
          .rh-detail  { display: none !important; }
          .rh-mobile-overlay {
            display: flex;
            flex-direction: column;
            position: fixed;
            inset: 0;
            z-index: 50;
            background: #0d0c1a;
            overflow-y: auto;
          }
        }
      `}</style>

      <div className="rh-layout">
        <div className="rh-timeline">
          <RunHistoryTimeline
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
            runs={enrichedRuns}
          />
        </div>

        {selectedRunId && (
          <div className="rh-detail">
            <RunDetailPanel runId={selectedRunId} />
          </div>
        )}
      </div>

      {/* AC-6: Mobile fullscreen overlay — shown only on <768px */}
      {selectedRunId && (
        <div className="rh-mobile-overlay">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #2a2540',
              background: '#13111c',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <button
              onClick={() => setSelectedRunId(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              ← Wróć
            </button>
          </div>
          <div style={{ padding: '12px 16px', flex: 1 }}>
            <RunDetailPanel
              runId={selectedRunId}
              onClose={() => setSelectedRunId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Zakładka Eval — renderuje EvalFrameworkPanel, CostTrackerPanel
 * i nową sekcję historii runów (STORY-7.8).
 */
export default function EvalTab() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: '20px',
            color: '#4b4569',
            fontSize: '13px',
          }}
        >
          Ładowanie Eval...
        </div>
      }
    >
      <EvalTabContent />
    </Suspense>
  )
}
