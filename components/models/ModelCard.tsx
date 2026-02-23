'use client'
// components/models/ModelCard.tsx
// Karta jednego modelu AI — STORY-5.5.
// Wyświetla statystyki, koszty i toggle monitorowania.

import { ModelEntry } from '@/types/models'
import { isModelMonitored } from '@/lib/model-monitoring'
import { MonitoringToggle } from './MonitoringToggle'
import { ModelDetailPanel } from './ModelDetailPanel'

interface ModelCardProps {
  model: ModelEntry
  isExpanded: boolean
  onToggleExpand: () => void
}

const PROVIDER_COLORS: Record<string, string> = {
  'Anthropic':   'bg-[#7c3aed]',
  'Moonshot AI': 'bg-[#3b82f6]',
  'Z.AI':        'bg-[#22c55e]',
  'OpenAI':      'bg-[#ef4444]',
}

type StatFormat = 'runs' | 'percent' | 'seconds' | 'cost'

function formatStat(value: number | null | undefined, format: StatFormat): string {
  if (value === null || value === undefined) return '—'
  switch (format) {
    case 'runs':    return String(value)
    case 'percent': return `${Math.round(value * 100)}%`
    case 'seconds': return `${value.toFixed(1)}s`
    case 'cost':    return `$${value.toFixed(2)}`
  }
}

export function ModelCard({ model, isExpanded, onToggleExpand }: ModelCardProps) {
  const monitored = isModelMonitored(model.canonical_key)
  const isDisabled = !monitored

  const providerColor = PROVIDER_COLORS[model.provider] ?? 'bg-slate-600'
  const providerInitial = model.provider[0] ?? '?'

  const stats = model.stats

  return (
    <div
      className={`bg-[#1a1730] border border-[#2a2540] rounded-xl p-6 transition-opacity ${
        isDisabled ? 'opacity-50' : ''
      }`}
    >
      {/* Header row */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {/* Provider circle */}
          <div
            className={`w-8 h-8 rounded-full ${providerColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
          >
            {providerInitial}
          </div>

          {/* Name + badges */}
          <div>
            <span className="text-white font-semibold">{model.display_name}</span>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="px-1.5 py-0.5 bg-[#2a2540] text-[#818cf8] text-xs rounded font-mono">
                {model.alias}
              </span>
              {isDisabled && (
                <span className="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">
                  Wyłączony
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Monitoring toggle */}
        <MonitoringToggle alias={model.canonical_key} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {(
          [
            { label: 'Runs',    value: formatStat(stats?.total_runs    ?? null, 'runs')    },
            { label: 'Success', value: formatStat(stats?.success_rate   ?? null, 'percent') },
            { label: 'Avg',     value: formatStat(stats?.avg_duration_s ?? null, 'seconds') },
            { label: 'Cost',    value: formatStat(stats?.total_cost_usd ?? null, 'cost')    },
          ] as const
        ).map(({ label, value }) => (
          <div key={label} className="bg-[#0d0c1a] rounded-lg p-2 text-center">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="text-sm text-white font-medium mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Cost row */}
      <div className="flex justify-between items-center mt-3">
        <span className="text-sm text-slate-400">
          Input:{' '}
          <span className="text-white">${model.cost_input_per_1m.toFixed(2)} / 1M</span>
          {' | '}
          Output:{' '}
          <span className="text-white">${model.cost_output_per_1m.toFixed(2)} / 1M</span>
        </span>
        <button
          onClick={onToggleExpand}
          className="text-xs text-[#818cf8] hover:text-white transition-colors"
        >
          Edytuj ceny
        </button>
      </div>

      {/* Expand button */}
      <div className="flex justify-center mt-3">
        <button
          onClick={onToggleExpand}
          className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          {isExpanded ? '▲' : '▼'} Szczegóły
        </button>
      </div>

      {/* Detail panel (accordion) */}
      {isExpanded && (
        <div className="mt-4 border-t border-[#2a2540] pt-4">
          <ModelDetailPanel
            alias={model.canonical_key}
            displayName={model.display_name}
          />
        </div>
      )}
    </div>
  )
}
