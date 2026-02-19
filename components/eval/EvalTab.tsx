'use client'

// components/eval/EvalTab.tsx
// Główny kontener zakładki Eval.
// Wywołuje hooki useEval() i useRuns(), przekazuje dane do paneli.

import { Suspense } from 'react'
import { useEval } from '@/hooks/useEval'
import { useRuns } from '@/hooks/useRuns'
import EvalFrameworkPanel from './EvalFrameworkPanel'
import CostTrackerPanel from './CostTrackerPanel'

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
