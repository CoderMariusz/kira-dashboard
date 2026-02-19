'use client'

// components/overview/ModelAgentsSection.tsx
// Section container: header + 4 model agent cards + StoryDetailModal.
// Receives runs from OverviewPage (useRuns hook output).

import { useState } from 'react'
import type { Run } from '@/types/bridge'
import ModelCard, { type ModelConfig } from './ModelCard'
import StoryDetailModal from './StoryDetailModal'

// ── Static model configuration ────────────────────────────────────────────
const MODEL_CONFIG: ModelConfig[] = [
  {
    key: 'kimi',
    name: 'Kimi K2.5',
    icon: '🌙',
    iconBg: '#1a3a5c',
    role: 'Easy · Short · Impl',
    status: 'active',
    sparklineColor: 'rgb(56,189,248)',
  },
  {
    key: 'glm',
    name: 'GLM-5',
    icon: '⚡',
    iconBg: '#1a3a1a',
    role: 'Frontend · Heartbeat',
    status: 'active',
    sparklineColor: 'rgb(74,222,128)',
  },
  {
    key: 'sonnet',
    name: 'Sonnet 4.6',
    icon: '🎵',
    iconBg: '#2d1b4a',
    role: 'Medium · Review · Main',
    status: 'active',
    sparklineColor: 'rgb(167,139,250)',
  },
  {
    key: 'codex',
    name: 'Codex 5.3',
    icon: '🔴',
    iconBg: '#3a1a1a',
    role: 'Hard · Infra Review',
    status: 'idle',
    sparklineColor: 'rgb(248,113,113)',
  },
]

// ── Props ─────────────────────────────────────────────────────────────────
interface ModelAgentsSectionProps {
  /** All runs returned by useRuns(). May be null while loading. */
  runs: Run[] | null
  isLoading: boolean
  isOffline: boolean
}

// ── Component ─────────────────────────────────────────────────────────────
export default function ModelAgentsSection({
  runs,
  isLoading,
  isOffline,
}: ModelAgentsSectionProps) {
  const [modalModel, setModalModel] = useState<ModelConfig | null>(null)

  // Normalise: treat null runs as empty array so cards render (empty state)
  const safeRuns: Run[] = runs ?? []

  return (
    <>
      {/* ── Section header ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#e6edf3',
            margin: 0,
          }}
        >
          Model Agents
        </h3>
        <span
          style={{
            fontSize: '11px',
            color: '#4b4569',
            marginLeft: '8px',
          }}
        >
          performance last 7 days — click for details
        </span>
        <span
          style={{
            fontSize: '11px',
            color: '#818cf8',
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          All runs →
        </span>
      </div>

      {/* ── 4 model cards ─────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        {MODEL_CONFIG.map((cfg) => {
          const modelRuns = safeRuns.filter((r) => r.model === cfg.key)
          return (
            <ModelCard
              key={cfg.key}
              config={cfg}
              runs={modelRuns}
              isLoading={isLoading && !isOffline}
              onAnalyze={() => setModalModel(cfg)}
            />
          )
        })}
      </div>

      {/* ── Story Detail Modal ──────────────────────────────────── */}
      {modalModel !== null && (
        <StoryDetailModal
          isOpen
          onClose={() => setModalModel(null)}
          modelConfig={modalModel}
          runs={safeRuns.filter((r) => r.model === modalModel.key)}
        />
      )}
    </>
  )
}
