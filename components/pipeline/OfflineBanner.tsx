'use client'

// components/pipeline/OfflineBanner.tsx
// Banner displayed when the dashboard is in Hybrid Mode (Supabase fallback).
// Shows sync timestamp with color-coded freshness indicator.
// STORY-5.9: AC-10

import { useMemo } from 'react'

interface OfflineBannerProps {
  /** ISO timestamp of the last successful sync. null = unknown. */
  syncedAt: string | null
}

/**
 * Returns color class and label based on data staleness:
 *   < 30 min  → yellow (fresh enough)
 *   30–60 min → orange (getting stale)
 *   > 60 min  → red (stale)
 */
function getStaleness(syncedAt: string | null): {
  colorClass: string
  label: string
  formattedTime: string | null
} {
  if (!syncedAt) {
    return {
      colorClass: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
      label: 'Tryb offline',
      formattedTime: null,
    }
  }

  const synced = new Date(syncedAt)
  const now = new Date()
  const ageMinutes = (now.getTime() - synced.getTime()) / 60_000

  const formattedTime = synced.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  if (ageMinutes < 30) {
    return {
      colorClass: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
      label: `⚠️ Tryb offline — dane z ostatniej synchronizacji (${formattedTime})`,
      formattedTime,
    }
  }

  if (ageMinutes < 60) {
    return {
      colorClass: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
      label: `⚠️ Tryb offline — dane z ostatniej synchronizacji (${formattedTime})`,
      formattedTime,
    }
  }

  return {
    colorClass: 'bg-red-500/15 border-red-500/40 text-red-300',
    label: `🔴 Tryb offline — dane mogą być nieaktualne (ostatnia sync: ${formattedTime})`,
    formattedTime,
  }
}

export function OfflineBanner({ syncedAt }: OfflineBannerProps) {
  const { colorClass, label } = useMemo(() => getStaleness(syncedAt), [syncedAt])

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-md border text-xs font-medium mb-3 ${colorClass}`}
      role="status"
      aria-label="Tryb offline — dane z Supabase"
    >
      <span className="shrink-0">📡</span>
      <span>{label}</span>
    </div>
  )
}

export default OfflineBanner
