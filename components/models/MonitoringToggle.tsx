'use client'
// components/models/MonitoringToggle.tsx
// Toggle przełączający monitoring modelu z optimistic UI.
// Używa localStorage do persystencji stanu.

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { isModelMonitored, setModelMonitoring } from '@/lib/model-monitoring'

interface MonitoringToggleProps {
  alias: string   // canonical_key modelu, np. "kimi-k2.5", "sonnet-4.6"
  onToggle?: (enabled: boolean) => void
}

export function MonitoringToggle({ alias, onToggle }: MonitoringToggleProps) {
  // SSR-safe: domyślnie true (ON) po stronie serwera
  const [enabled, setEnabled] = useState<boolean>(true)

  // Synchronizacja z localStorage po hydration (unika hydration mismatch)
  useEffect(() => {
    setEnabled(isModelMonitored(alias))
  }, [alias])

  const handleToggle = (checked: boolean) => {
    // Optimistic update: natychmiast zmieniamy UI
    setEnabled(checked)
    // Zapis do localStorage
    setModelMonitoring(alias, checked)
    // Powiadom rodzica (np. ModelCard) żeby odświeżył swój stan
    onToggle?.(checked)
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        id={`monitoring-${alias}`}
        checked={enabled}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-[#818cf8]"
      />
      <Label
        htmlFor={`monitoring-${alias}`}
        className="text-xs text-slate-400 cursor-pointer select-none"
      >
        Monitoruj
      </Label>
    </div>
  )
}
