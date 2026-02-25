'use client'

// components/eval/EvalTab.tsx
// Główny kontener zakładki Eval.
// Wywołuje hooki useEval() i useRuns(), przekazuje dane do paneli.
// STORY-7.8: dodano RunHistoryTimeline + RunDetailPanel pod istniejącymi panelami.

import { Suspense, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { useEval } from '@/hooks/useEval'
import { useRuns } from '@/hooks/useRuns'
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
        @media (max-width: 1023px) and (min-width: 768px) {
          .rh-layout { flex-direction: column; }
          .rh-timeline { width: 100%; }
        }
        @media (max-width: 767px) {
          .rh-layout { flex-direction: column; }
          .rh-timeline { width: 100%; }
          .rh-detail  { display: none; }
        }
      `}</style>

      <div className="rh-layout">
        <div className="rh-timeline">
          <RunHistoryTimeline
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
          />
        </div>

        {selectedRunId && (
          <div className="rh-detail">
            <RunDetailPanel runId={selectedRunId} />
          </div>
        )}
      </div>
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
