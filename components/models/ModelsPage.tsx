'use client'
// components/models/ModelsPage.tsx
// Główny komponent strony /dashboard/models — STORY-5.5.
// Obsługuje 4 stany: Loading, Empty, Offline, Filled.

import { useState } from 'react'
import { useModels } from '@/hooks/useModels'
import { isModelMonitored } from '@/lib/model-monitoring'
import { ModelCard } from './ModelCard'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface HeaderProps {
  activeCount: number
  isLoading?: boolean
}

function Header({ activeCount, isLoading }: HeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <h1 className="text-2xl font-bold text-white">Modele AI</h1>
      <span className="px-2 py-1 rounded-full bg-[#2a2540] text-[#818cf8] text-sm font-medium">
        {isLoading ? '...' : `${activeCount} aktywnych`}
      </span>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-[#1a1730] border border-[#2a2540] rounded-xl p-6 animate-pulse"
        >
          <div className="h-6 w-3/4 bg-[#2a2540] rounded" />
          <div className="h-4 w-full bg-[#2a2540] rounded mt-4" />
          <div className="h-4 w-1/2 bg-[#2a2540] rounded mt-3" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <span className="text-5xl mb-4" role="img" aria-label="robot">🤖</span>
      <p className="text-center">
        Brak skonfigurowanych modeli. Dodaj modele w bridge.yml.
      </p>
    </div>
  )
}

interface OfflineStateProps {
  onRetry: () => void
  isRetrying: boolean
}

function OfflineState({ onRetry, isRetrying }: OfflineStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
      <span className="text-4xl" role="img" aria-label="warning">⚠️</span>
      <p className="text-white font-medium">Bridge niedostępny</p>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className={`px-4 py-2 bg-[#818cf8] text-white rounded-lg text-sm font-medium transition-opacity ${
          isRetrying ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
        }`}
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ModelsPage() {
  const { models, isLoading, error, mutate } = useModels()
  const [expandedAlias, setExpandedAlias] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Badge count — based on localStorage monitoring state
  const activeCount = models.filter((m) => isModelMonitored(m.canonical_key)).length

  const handleRetry = async () => {
    setIsRetrying(true)
    await mutate()
    setTimeout(() => setIsRetrying(false), 500)
  }

  const handleToggleExpand = (canonicalKey: string) => {
    setExpandedAlias((prev) => (prev === canonicalKey ? null : canonicalKey))
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <>
        <Header activeCount={0} isLoading />
        <SkeletonGrid />
      </>
    )
  }

  // --- Error / Offline ---
  if (error) {
    return (
      <>
        <Header activeCount={0} />
        <OfflineState onRetry={handleRetry} isRetrying={isRetrying} />
      </>
    )
  }

  // --- Empty ---
  if (models.length === 0) {
    return (
      <>
        <Header activeCount={0} />
        <EmptyState />
      </>
    )
  }

  // --- Filled ---
  return (
    <>
      <Header activeCount={activeCount} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {models.map((model) => (
          <ModelCard
            key={model.canonical_key}
            model={model}
            isExpanded={expandedAlias === model.canonical_key}
            onToggleExpand={() => handleToggleExpand(model.canonical_key)}
          />
        ))}
      </div>
    </>
  )
}
