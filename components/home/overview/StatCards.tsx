'use client'
// components/home/overview/StatCards.tsx
// AC-3 — 4 stat cards: Zadania dziś, Do kupienia, Aktywność dziś, Rodzina

import type { Task, ColumnWithTasks } from '@/types/home'
import type { ShoppingItem } from '@/types/home'
import type { HouseholdMember, HouseholdMemberExtended } from '@/types/home'

interface StatCardsProps {
  columns:         ColumnWithTasks[]
  shoppingPending: ShoppingItem[]
  activityCount:   number
  members:         (HouseholdMember | HouseholdMemberExtended)[]
  isLoading:       boolean
  noHousehold?:    boolean
}

// Skeleton jednej karty
function SkeletonCard() {
  return (
    <div
      className="animate-pulse"
      style={{ height: '88px', background: '#2a2540', borderRadius: '10px' }}
      aria-hidden="true"
    />
  )
}

interface StatCardProps {
  label:     string
  value:     string | number
  subtext:   string
  trend?:    { text: string; color: string }
  ariaLabel: string
}

function StatCard({ label, value, subtext, trend, ariaLabel }: StatCardProps) {
  return (
    <article
      aria-label={ariaLabel}
      style={{
        background:   '#1a1730',
        border:       '1px solid #2a2540',
        borderRadius: '10px',
        padding:      '14px 16px',
        transition:   'border-color 0.15s, transform 0.15s',
      }}
      className="hover:border-[#4b3d7a] hover:-translate-y-px"
    >
      <div
        style={{
          fontSize:      '10px',
          color:         '#4b4569',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom:  '6px',
          fontWeight:    600,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: '#e6edf3', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
        {subtext}
      </div>
      {trend && (
        <div style={{ fontSize: '10px', color: trend.color, marginTop: '4px' }}>
          {trend.text}
        </div>
      )}
    </article>
  )
}

export function StatCards({
  columns,
  shoppingPending,
  activityCount,
  members,
  isLoading,
  noHousehold = false,
}: StatCardsProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  // ─── Karta 1: Zadania dziś ───────────────────────────────────────
  const allTasks: Task[] = columns.flatMap(col => col.tasks)
  const todayStr = new Date().toDateString()
  const tasksToday = allTasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === todayStr)
  const todayIds = new Set(tasksToday.map(t => t.id))

  const todoCol   = columns.find(c => c.position === 0)
  const inProgCol = columns.find(c => c.position === 1)
  const todoCount   = todoCol?.tasks.filter(t => todayIds.has(t.id)).length ?? 0
  const inProgCount = inProgCol?.tasks.filter(t => todayIds.has(t.id)).length ?? 0

  const taskSubtext = tasksToday.length > 0
    ? `${todoCount} nierozpoczęte · ${inProgCount} w trakcie`
    : 'brak zadań na dziś'

  // ─── Karta 2: Do kupienia ────────────────────────────────────────
  const uniqueCategories = new Set(shoppingPending.map(i => i.category).filter(Boolean))
  const shoppingSubtext = uniqueCategories.size > 0
    ? `w ${uniqueCategories.size} ${uniqueCategories.size === 1 ? 'kategorii' : 'kategoriach'}`
    : 'lista pusta 🎉'

  // ─── Karta 3: Aktywność dziś ─────────────────────────────────────
  const activityTrend = activityCount === 0
    ? { text: '— brak aktywności', color: '#4b4569' }
    : activityCount > 3
      ? { text: '🔥 aktywny dzień', color: '#f9a8d4' }
      : undefined

  // ─── Karta 4: Rodzina ────────────────────────────────────────────
  const memberCount = members.length
  const memberNames = members.slice(0, 3).map(m => {
    const ext = m as HouseholdMemberExtended
    return ext.display_name ?? m.user_id.slice(0, 6)
  })
  const memberSubtext = memberCount === 0
    ? (noHousehold ? 'Utwórz lub dołącz do household' : 'brak członków')
    : memberNames.join(', ') + (memberCount > 3 ? '...' : '')

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="✅ ZADANIA DZIŚ"
        value={tasksToday.length}
        subtext={taskSubtext}
        ariaLabel={`Zadania dziś: ${tasksToday.length}`}
      />
      <StatCard
        label="🛒 DO KUPIENIA"
        value={shoppingPending.length}
        subtext={shoppingSubtext}
        ariaLabel={`Do kupienia: ${shoppingPending.length}`}
      />
      <StatCard
        label="📡 AKTYWNOŚĆ DZIŚ"
        value={activityCount}
        subtext="zdarzeń w tym dniu"
        trend={activityTrend}
        ariaLabel={`Aktywność dziś: ${activityCount}`}
      />
      <StatCard
        label="👥 CZŁONKOWIE RODZINY"
        value={memberCount}
        subtext={memberSubtext}
        trend={memberCount > 0 ? { text: 'wszyscy w rodzinie', color: '#4b4569' } : undefined}
        ariaLabel={`Członkowie rodziny: ${memberCount}`}
      />
    </div>
  )
}
