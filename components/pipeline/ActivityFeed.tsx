'use client'

// components/pipeline/ActivityFeed.tsx
// Right card: live activity feed — last 20 runs sorted DESC.
// Auto-refreshes every 30 seconds via setInterval + useEffect cleanup.

import { useEffect } from 'react'
import type { Run } from '@/types/bridge'
import ActivityItem from './ActivityItem'

interface ActivityFeedProps {
  runs: Run[] | null
  isLoading: boolean
  isOffline: boolean
  onRefresh: () => void
}

export default function ActivityFeed({
  runs,
  isLoading,
  isOffline,
  onRefresh,
}: ActivityFeedProps) {
  // Auto-refresh every 30 seconds — cleanup on unmount (prevents interval leak)
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh()
    }, 30_000)

    return () => clearInterval(interval)
  }, [onRefresh])

  // Last 20 runs sorted DESC (newest first)
  const last20 = [...(runs ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20)

  return (
    <div
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '12px',
          gap: '6px',
        }}
      >
        <h3
          style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', margin: 0 }}
        >
          Activity Feed
        </h3>
        <span style={{ fontSize: '11px', color: '#4b4569' }}>— live events</span>
        <span
          style={{
            fontSize: '11px',
            color: '#818cf8',
            cursor: 'default',
            marginLeft: 'auto',
          }}
        >
          All events →
        </span>
      </div>

      {/* Offline state */}
      {isOffline && (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#4b4569',
            background: '#13111c',
            borderRadius: '8px',
          }}
        >
          🔌 Bridge offline — brak danych aktywności
        </div>
      )}

      {/* Loading skeleton */}
      {!isOffline && isLoading && (
        <div
          style={{
            height: '200px',
            background: '#2a2540',
            borderRadius: '8px',
            opacity: 0.5,
          }}
        />
      )}

      {/* Empty state */}
      {!isOffline && !isLoading && last20.length === 0 && (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#4b4569',
            background: '#13111c',
            borderRadius: '8px',
          }}
        >
          Brak eventów — pipeline idle
        </div>
      )}

      {/* Event list */}
      {!isOffline && !isLoading && last20.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {last20.map((run, i) => (
            <ActivityItem
              key={run.id}
              run={run}
              isLast={i === last20.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
