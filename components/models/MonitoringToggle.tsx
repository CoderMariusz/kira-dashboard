'use client'
// components/models/MonitoringToggle.tsx
// Placeholder — pełna implementacja w STORY-5.7.
// Renderuje prosty toggle przełączający localStorage monitoring state.

import { useState, useEffect } from 'react'
import { isModelMonitored, setModelMonitoring } from '@/lib/model-monitoring'

interface MonitoringToggleProps {
  alias: string
}

export function MonitoringToggle({ alias }: MonitoringToggleProps) {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(isModelMonitored(alias))
  }, [alias])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !enabled
    setModelMonitoring(alias, next)
    setEnabled(next)
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={enabled ? 'Wyłącz monitoring' : 'Włącz monitoring'}
      className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${
        enabled ? 'bg-[#818cf8]' : 'bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
