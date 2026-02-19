'use client'

// components/overview/OverviewPage.tsx
// Container for the Overview tab — stat cards, velocity chart, Kira banner.
// Calls useStats() and useRuns() hooks; handles loading / offline states.

import { useStats } from '@/hooks/useStats'
import { useRuns } from '@/hooks/useRuns'
import KiraBanner from './KiraBanner'
import StatCard from './StatCard'
import VelocityChart from './VelocityChart'
import ModelAgentsSection from './ModelAgentsSection'

export default function OverviewPage() {
  const { stats, loading: statsLoading, offline: statsOffline } = useStats()
  const { runs, loading: runsLoading, offline: runsOffline } = useRuns()

  const isOffline = statsOffline || runsOffline
  const isLoading = statsLoading || runsLoading

  return (
    <div
      style={{
        padding: '18px 20px',
        overflowY: 'auto',
        flex: 1,
        background: '#13111c',
        minHeight: '100vh',
      }}
    >
      {/* Kira v1.0 banner — always visible */}
      <KiraBanner isOffline={isOffline} />

      {/* 4 stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <StatCard
          label="STORIES DONE"
          value={stats?.stories_done}
          sub="across 15 epics"
          trend="↑ +10 this session"
          trendType="up"
          isLoading={isLoading}
          isOffline={isOffline}
        />
        <StatCard
          label="TOTAL RUNS"
          value={stats?.total_runs}
          sub="auto-tracked from today"
          trend="↑ hooks live ✅"
          trendType="up"
          isLoading={isLoading}
          isOffline={isOffline}
        />
        <StatCard
          label="SUCCESS RATE"
          value={stats ? `${(stats.success_rate * 100).toFixed(1)}%` : undefined}
          sub="kimi 100% · glm 85.7%"
          trend="↑ 7-day trend stable"
          trendType="up"
          isLoading={isLoading}
          isOffline={isOffline}
        />
        <StatCard
          label="AVG DURATION"
          value={stats ? `${stats.avg_run_duration_s.toFixed(0)}s` : undefined}
          sub="avg run time · all models"
          trend="per pipeline run"
          trendType="up"
          isLoading={isLoading}
          isOffline={isOffline}
        />
      </div>

      {/* Velocity chart — last 30 days */}
      <VelocityChart
        runs={runs}
        isLoading={runsLoading}
        isOffline={runsOffline}
      />

      {/* Model agent cards — STORY-1.4 */}
      <ModelAgentsSection
        runs={runs}
        isLoading={runsLoading}
        isOffline={runsOffline}
      />
    </div>
  )
}
