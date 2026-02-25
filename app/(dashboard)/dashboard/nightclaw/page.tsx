'use client'

/**
 * app/(dashboard)/dashboard/nightclaw/page.tsx
 * STORY-9.6 + STORY-9.7 — NightClaw Digest page
 *
 * Route: /dashboard/nightclaw
 *
 * Layout:
 *  - Header: "🌙 NightClaw Digest" + date badge + 4 tabs [Overview | Digest | Research | Stats]
 *  - Tab Overview:
 *    - Last run card (date, duration, status badge)
 *    - 4 stat cards: New patterns | Lessons | Open issues | Modified skills
 *    - Bridge status (online/offline)
 *
 * States:
 *  - Loading: 4 skeleton cards
 *  - Error: message + retry button + "Bridge offline" badge
 *  - Success: real data from useNightClawDigest
 *
 * Tab URL state: ?tab=overview|digest|research|stats
 */

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useNightClawDigest } from '@/hooks/useNightClawDigest'
import { useNightClawHistory } from '@/hooks/useNightClawHistory'
import type { DigestSummary } from '@/types/nightclaw'
import DigestViewer from '@/components/nightclaw/DigestViewer'
import RunCalendar from '@/components/nightclaw/RunCalendar'

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0d0c1a',
  card: '#1a1730',
  border: '#3b3d7a',
  accent: '#818cf8',
  text: '#e6edf3',
  muted: '#4b4569',
  ok: '#22c55e',
  error: '#ef4444',
  miss: '#374151',
} as const

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'digest' | 'research' | 'stats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'digest', label: 'Digest' },
  { id: 'research', label: 'Research' },
  { id: 'stats', label: 'Stats' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div
      data-testid="stat-card-skeleton"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '10px',
        padding: '20px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    >
      <div style={{ height: '12px', width: '60%', background: COLORS.muted, borderRadius: '4px', marginBottom: '12px', opacity: 0.4 }} />
      <div style={{ height: '32px', width: '40%', background: COLORS.muted, borderRadius: '4px', opacity: 0.4 }} />
    </div>
  )
}

interface StatCardProps {
  testId: string
  icon: string
  label: string
  value: number | string
  color?: string
}

function StatCard({ testId, icon, label, value, color }: StatCardProps) {
  return (
    <div
      data-testid={testId}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '10px',
        padding: '20px',
      }}
    >
      <div style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        <span style={{ marginRight: '6px' }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: color ?? COLORS.text, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

interface RunStatusBadgeProps {
  status: 'ok' | 'error' | 'missing'
}

function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const cfg = {
    ok: { label: 'OK', color: COLORS.ok },
    error: { label: 'ERROR', color: COLORS.error },
    missing: { label: 'MISSING', color: COLORS.miss },
  }[status]

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontWeight: 700,
      color: '#fff',
      background: cfg.color,
      letterSpacing: '0.05em',
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

interface OverviewTabProps {
  summary: DigestSummary | undefined
  isLoading: boolean
  error: Error | undefined
  refresh: () => void
  historyError: Error | undefined
  lastRunDate: string | undefined
  lastRunStatus: 'ok' | 'error' | 'missing' | undefined
}

function OverviewTab({ summary, isLoading, error, refresh, historyError, lastRunDate, lastRunStatus }: OverviewTabProps) {
  const isOffline = !!error || !!historyError

  if (isLoading) {
    return (
      <div>
        {/* Last run card skeleton */}
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '24px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ height: '14px', width: '30%', background: COLORS.muted, borderRadius: '4px', opacity: 0.4 }} />
        </div>

        {/* 4 stat card skeletons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        {/* Bridge offline badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '9999px',
          background: '#1f0a0a',
          border: `1px solid ${COLORS.error}`,
          color: COLORS.error,
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '20px',
        }}>
          <span>⚠️</span>
          Bridge offline
        </div>

        <p style={{ color: COLORS.muted, marginBottom: '24px', fontSize: '14px' }}>
          {error.message}
        </p>

        <button
          onClick={refresh}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            background: COLORS.accent,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          Spróbuj ponownie
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Last run card */}
      {lastRunDate && (
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              🕒 Ostatni run
            </div>
            <div style={{ color: COLORS.text, fontWeight: 600, fontSize: '16px' }}>
              {lastRunDate}
            </div>
          </div>
          {lastRunStatus && (
            <RunStatusBadge status={lastRunStatus} />
          )}
          {isOffline && !error && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: '#1f0a0a',
              border: `1px solid ${COLORS.error}`,
              color: COLORS.error,
              fontSize: '11px',
              fontWeight: 600,
            }}>
              Bridge offline
            </span>
          )}
        </div>
      )}

      {/* 4 Stat cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard
            testId="stat-card-patterns"
            icon="🧩"
            label="Nowe wzorce"
            value={summary.new_patterns}
            color={COLORS.accent}
          />
          <StatCard
            testId="stat-card-lessons"
            icon="📚"
            label="Lekcje"
            value={summary.lessons_extracted}
            color={COLORS.ok}
          />
          <StatCard
            testId="stat-card-issues"
            icon="🐛"
            label="Otwarte problemy"
            value={summary.open_issues}
            color={summary.open_issues > 0 ? COLORS.error : COLORS.text}
          />
          <StatCard
            testId="stat-card-skills"
            icon="⚡"
            label="Zmod. skille"
            value={summary.anti_patterns_flagged}
            color={COLORS.muted}
          />
        </div>
      )}

      {/* Bridge status */}
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isOffline ? COLORS.error : COLORS.ok,
        }} />
        <span style={{ fontSize: '12px', color: COLORS.muted }}>
          Bridge {isOffline ? 'offline' : 'online'}
        </span>
      </div>
    </div>
  )
}

// ─── Page Content (uses useSearchParams — must be wrapped in Suspense) ────────

function NightClawPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const activeTab = (searchParams.get('tab') ?? 'overview') as Tab

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // STORY-9.7 — date state for calendar ↔ DigestViewer sync
  const [selectedDate, setSelectedDate] = useState<string>(today)

  const { data: digest, isLoading: digestLoading, error: digestError, refresh: digestRefresh } = useNightClawDigest()
  const { data: history, isLoading: historyLoading, error: historyError } = useNightClawHistory()

  const isLoading = digestLoading || historyLoading

  const lastEntry = history?.entries[0]

  function handleTabChange(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/dashboard/nightclaw?${params.toString()}`)
  }

  return (
    <div style={{ minHeight: '100%', background: COLORS.bg, padding: '0', color: COLORS.text }}>

      {/* ─── Header ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: COLORS.text, margin: 0 }}>
          🌙 NightClaw Digest
        </h1>

        {/* Date badge */}
        <span
          data-testid="date-badge"
          style={{
            padding: '4px 12px',
            borderRadius: '9999px',
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.accent,
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {today}
        </span>
      </div>

      {/* ─── Tabs ─── */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: `1px solid ${COLORS.border}`,
          paddingBottom: '0',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? COLORS.accent : COLORS.muted,
              fontWeight: activeTab === tab.id ? 700 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div id={`panel-${activeTab}`} role="tabpanel">
        {activeTab === 'overview' && (
          <OverviewTab
            summary={digest?.summary}
            isLoading={isLoading}
            error={digestError}
            refresh={digestRefresh}
            historyError={historyError}
            lastRunDate={lastEntry?.date}
            lastRunStatus={lastEntry?.status}
          />
        )}
        {activeTab === 'digest' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* STORY-9.7: Digest viewer (date picker is internal to DigestViewer) */}
            <DigestViewer key={selectedDate} initialDate={selectedDate} />

            {/* STORY-9.7: 90-day run calendar */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 500, color: COLORS.muted, marginBottom: '12px' }}>
                Historia runów (90 dni)
              </h3>
              <RunCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
            </div>
          </div>
        )}
        {activeTab === 'research' && (
          <div style={{ color: COLORS.muted, padding: '24px 0', fontSize: '14px' }}>
            Research — implementacja w STORY-9.7
          </div>
        )}
        {activeTab === 'stats' && (
          <div style={{ color: COLORS.muted, padding: '24px 0', fontSize: '14px' }}>
            Stats — implementacja w STORY-9.8
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Page export — wraps content in Suspense for useSearchParams ──────────────

export default function NightClawPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '20px', color: COLORS.muted, fontSize: '13px' }}>
          Ładowanie NightClaw…
        </div>
      }
    >
      <NightClawPageContent />
    </Suspense>
  )
}
