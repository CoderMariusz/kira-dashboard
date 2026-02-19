'use client'

// app/(dashboard)/dashboard/page.tsx
// Główna strona dashboardu — renderuje aktywną zakładkę na podstawie ?tab= param.
// Zakładki: overview, pipeline, models, epics, eval, patterns, insights.

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useActiveTab } from '@/hooks/useActiveTab'
import OverviewPage from '@/components/overview/OverviewPage'
import { InsightsTab } from '@/components/insights/InsightsTab'
import PipelinePage from '@/components/pipeline/PipelinePage'

// Dynamic import for eval tab — lazy-loaded to keep initial bundle small
const EvalTab = dynamic(() => import('@/components/eval/EvalTab'), {
  loading: () => (
    <div style={{ padding: '20px', color: '#4b4569', fontSize: '13px' }}>
      Ładowanie Eval...
    </div>
  ),
  ssr: false,
})

function DashboardContent() {
  const { activeTab } = useActiveTab()

  // Renderuj odpowiedni komponent dla aktywnej zakładki
  switch (activeTab) {
    case 'overview':
      return <OverviewPage />
    case 'pipeline':
      return <PipelinePage />
    case 'insights':
      return <InsightsTab />
    case 'eval':
      return <EvalTab />
    case 'models':
      return <div className="p-8 text-gray-400">Models — coming soon</div>
    case 'epics':
      return <div className="p-8 text-gray-400">Epics — coming soon</div>
    default:
      // Pozostałe zakładki — placeholder (implementowane w STORY-1.3 do 1.6)
      return (
        <div className="text-zinc-400 p-6">
          <h1 className="text-xl font-semibold text-white mb-2">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h1>
          <p>
            Treść zakładki &quot;{activeTab}&quot; — implementowana w kolejnych stories.
          </p>
        </div>
      )
  }
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="text-zinc-500 text-sm p-6">Ładowanie...</div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
