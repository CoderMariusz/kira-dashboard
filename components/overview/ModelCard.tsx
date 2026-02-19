'use client'

// components/overview/ModelCard.tsx
// Single model agent card with icon, role, status, metrics, sparkline, and action buttons.

import ModelSparkline from './ModelSparkline'
import type { Run } from '@/types/bridge'

export interface ModelConfig {
  key: string
  name: string
  icon: string
  iconBg: string
  role: string
  status: 'active' | 'idle'
  sparklineColor: string
}

interface ModelCardProps {
  config: ModelConfig
  runs: Run[]
  isLoading: boolean
  onAnalyze: () => void
}

export default function ModelCard({ config, runs, isLoading, onAnalyze }: ModelCardProps) {
  // Compute metrics — guard against null duration_seconds
  const totalRuns = runs.length
  const doneRuns = runs.filter((r) => r.status === 'DONE').length
  const successRate =
    totalRuns > 0 ? `${((doneRuns / totalRuns) * 100).toFixed(1)}%` : '—'

  const validDurations = runs.filter((r) => r.duration_seconds !== null)
  const avgDuration =
    validDurations.length > 0
      ? `${(
          validDurations.reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0) /
          validDurations.length /
          60
        ).toFixed(1)}m`
      : '—'

  // Sparkline: last 10 runs sorted ASC → cumulative index [1, 2, ..., n]
  const last10 = [...runs]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-10)
  const sparklineData = last10.map((_, i) => i + 1)

  const isActive = config.status === 'active'

  return (
    <div
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '13px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#3b3d7a'
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,.3)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#2a2540'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Header: icon + name + role + status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            background: config.iconBg,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            flexShrink: 0,
          }}
        >
          {config.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>
            {config.name}
          </div>
          <div style={{ fontSize: '10px', color: '#4b4569' }}>{config.role}</div>
        </div>
        <div
          style={{
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isActive ? '#4ade80' : '#d29922',
            }}
          />
          <span style={{ color: isActive ? '#4ade80' : '#d29922' }}>
            {isActive ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          marginBottom: '9px',
        }}
      >
        {[
          { value: totalRuns === 0 ? '—' : String(totalRuns), label: 'Runs' },
          { value: successRate, label: 'Success' },
          { value: avgDuration, label: 'Avg' },
        ].map(({ value, label }) => (
          <div key={label}>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#e6edf3',
              }}
            >
              {isLoading ? '—' : value}
            </div>
            <div style={{ fontSize: '9px', color: '#6b7280' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sparkline (40px height) */}
      <div style={{ height: '40px', marginBottom: '9px' }}>
        {sparklineData.length > 0 && !isLoading ? (
          <ModelSparkline data={sparklineData} color={config.sparklineColor} />
        ) : (
          <div
            style={{
              height: '40px',
              background: '#13111c',
              borderRadius: '4px',
            }}
          />
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAnalyze()
          }}
          aria-label={`Analyze ${config.name} runs`}
          style={{
            padding: '5px',
            background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          ✨ Analyze
        </button>
        <button
          style={{
            padding: '5px',
            background: '#2a2540',
            color: '#6b7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Runs
        </button>
      </div>
    </div>
  )
}
