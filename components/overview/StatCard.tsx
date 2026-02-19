// components/overview/StatCard.tsx
// Reużywalny komponent karty statystyk z loading skeleton i offline state.

import React from 'react'

interface StatCardProps {
  label: string
  value?: string | number
  sub?: string
  trend?: string
  trendType?: 'up' | 'down'
  isLoading?: boolean
  isOffline?: boolean
}

export default function StatCard({
  label,
  value,
  sub,
  trend,
  trendType = 'up',
  isLoading,
  isOffline,
}: StatCardProps) {
  const showSkeleton = isLoading && value === undefined

  return (
    <div
      className="stat-card"
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '14px 16px',
        transition: 'border-color 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#3b3d7a'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#2a2540'
      }}
    >
      {/* Label */}
      {showSkeleton ? (
        <div
          className="animate-pulse"
          style={{
            width: '80px',
            height: '10px',
            background: '#2a2540',
            borderRadius: '4px',
            marginBottom: '6px',
          }}
        />
      ) : (
        <div
          style={{
            fontSize: '10px',
            color: '#4b4569',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}
        >
          {label}
        </div>
      )}

      {/* Value */}
      {showSkeleton ? (
        <div
          className="animate-pulse"
          style={{
            width: '60px',
            height: '28px',
            background: '#2a2540',
            borderRadius: '4px',
          }}
        />
      ) : (
        <div
          style={{
            fontSize: '25px',
            fontWeight: 800,
            color: isOffline ? '#4b4569' : '#e6edf3',
            lineHeight: 1,
          }}
        >
          {isOffline ? '—' : (value ?? '—')}
        </div>
      )}

      {/* Sub */}
      {!showSkeleton && !isOffline && sub && (
        <div
          style={{
            fontSize: '10px',
            color: '#4b4569',
            marginTop: '4px',
          }}
        >
          {sub}
        </div>
      )}

      {/* Trend */}
      {!showSkeleton && !isOffline && trend && (
        <div
          style={{
            fontSize: '10px',
            color: trendType === 'up' ? '#4ade80' : '#f87171',
            marginTop: '3px',
          }}
        >
          {trend}
        </div>
      )}
    </div>
  )
}
