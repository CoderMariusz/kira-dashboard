'use client'

// components/insights/NightClawDigestCard.tsx
// Karta NightClaw Digest — pokazuje statystyki ostatniego raportu NightClaw.
// Klikalność otwiera raport w nowej karcie przeglądarki (AC-3).
// Obsługuje stany: loading, noDigest (404), offline, filled.

import { useState } from 'react'
import { useNightClaw } from '@/hooks/useNightClaw'
import { BRIDGE_URL } from '@/lib/bridge'
import type { NightClawData } from '@/types/insights'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function NightClawSkeleton() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #13111c, #1a1730)',
        border: '1px solid #3b3d7a',
        borderRadius: 10,
        padding: 14,
      }}
    >
      {/* Header skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            background: '#2a2540',
            borderRadius: 9,
          }}
          className="animate-pulse"
        />
        <div style={{ flex: 1 }}>
          <div
            style={{ height: 13, width: '60%', background: '#2a2540', borderRadius: 4, marginBottom: 5 }}
            className="animate-pulse"
          />
          <div
            style={{ height: 10, width: '80%', background: '#2a2540', borderRadius: 4 }}
            className="animate-pulse"
          />
        </div>
      </div>
      {/* Stats skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ height: 54, background: '#2a2540', borderRadius: 7 }}
            className="animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

// ─── Stat cell ───────────────────────────────────────────────────────────────

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ background: '#13111c', borderRadius: 7, padding: '8px 10px' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#c4b5fd' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#4b4569' }}>{label}</div>
    </div>
  )
}

// ─── Filled card ─────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${day} o ${time}`
  } catch {
    return iso
  }
}

interface FilledCardProps {
  data: NightClawData
}

function FilledCard({ data }: FilledCardProps) {
  const [linkError, setLinkError] = useState(false)
  const hasFileUrl = Boolean(data.file_url)

  function handleClick() {
    if (!hasFileUrl) {
      setLinkError(true)
      setTimeout(() => setLinkError(false), 3000)
      return
    }
    const url = data.file_url.startsWith('http')
      ? data.file_url
      : `${BRIDGE_URL}${data.file_url}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div>
      <div
        role="link"
        tabIndex={0}
        aria-label={`Otwórz raport NightClaw z dnia ${data.date}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{
          background: 'linear-gradient(135deg, #13111c, #1a1730)',
          border: '1px solid #3b3d7a',
          borderRadius: 10,
          padding: 14,
          cursor: hasFileUrl ? 'pointer' : 'default',
          transition: '.15s',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!hasFileUrl) return
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = '#7c3aed'
          el.style.boxShadow = '0 0 20px rgba(124,58,237,.2)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = '#3b3d7a'
          el.style.boxShadow = 'none'
        }}
        onFocus={(e) => {
          if (!hasFileUrl) return
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = '#7c3aed'
          el.style.boxShadow = '0 0 20px rgba(124,58,237,.2)'
        }}
        onBlur={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = '#3b3d7a'
          el.style.boxShadow = 'none'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: '#1e1b4b',
              borderRadius: 9,
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden
          >
            🌙
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>NightClaw Digest</div>
            <div style={{ fontSize: 10, color: '#4b4569' }}>
              {formatDate(data.date)} · kliknij aby otworzyć · auto-runs o 2:00
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <StatCell value={data.new_patterns_today} label="New Patterns" />
          <StatCell value={data.lessons_extracted} label="Lessons" />
          <StatCell value={data.anti_patterns_flagged} label="Anti-patterns" />
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: 10, color: '#4b4569', marginTop: 8 }}>
          Ostatni raport: {formatTimestamp(data.timestamp)}
        </div>
      </div>

      {/* EC-3: link error inline message */}
      {linkError && (
        <div style={{ fontSize: 11, color: '#f87171', marginTop: 4, textAlign: 'center' }}>
          Link do raportu niedostępny
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Karta NightClaw Digest.
 * Obsługuje wszystkie stany: loading, brak raportu, offline, filled.
 */
export function NightClawDigestCard() {
  const { data, loading, offline, noDigest } = useNightClaw()

  if (loading) return <NightClawSkeleton />

  // Header wspólny dla offline i noDigest
  const cardHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          background: '#1e1b4b',
          borderRadius: 9,
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden
      >
        🌙
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>NightClaw Digest</div>
      </div>
    </div>
  )

  if (offline) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #13111c, #1a1730)',
          border: '1px solid #3b3d7a',
          borderRadius: 10,
          padding: 14,
        }}
      >
        {cardHeader}
        <div style={{ fontSize: 12, color: '#4b4569', textAlign: 'center', padding: '16px 0' }}>
          Raport niedostępny — Bridge API offline
        </div>
      </div>
    )
  }

  if (noDigest) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #13111c, #1a1730)',
          border: '1px solid #3b3d7a',
          borderRadius: 10,
          padding: 14,
          cursor: 'default',
        }}
      >
        {cardHeader}
        <div style={{ fontSize: 13, color: '#4b4569', textAlign: 'center', padding: '16px 0' }}>
          No digest yet today
        </div>
        <div style={{ fontSize: 10, color: '#4b4569', textAlign: 'center' }}>
          Raport NightClaw generowany automatycznie o 2:00 AM
        </div>
      </div>
    )
  }

  if (data) {
    return <FilledCard data={data} />
  }

  return null
}
