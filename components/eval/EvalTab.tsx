'use client'

// components/eval/EvalTab.tsx
// Główny kontener zakładki Eval.
// Wywołuje hooki useEval() i useRuns(), przekazuje dane do paneli.

import { Suspense } from 'react'
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

function EvalTabContent() {
  const {
    scores,
    overallScore,
    recentRuns,
    loading: evalLoading,
    offline: evalOffline,
  } = useEval()

  const { runs, loading: runsLoading } = useRuns()

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

      <EvalInfoPanel />

      <EvalFrameworkPanel
        scores={scores}
        overallScore={overallScore}
        recentRuns={recentRuns}
        isLoading={evalLoading}
        isOffline={evalOffline}
      />
      <CostTrackerPanel runs={runs} isLoading={runsLoading} />
    </div>
  )
}

/**
 * Zakładka Eval — renderuje EvalFrameworkPanel i CostTrackerPanel.
 * Wrapuje w Suspense bo hooki używają useSearchParams() pośrednio przez SWR.
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
