'use client'
// components/home/overview/RecentActivity.tsx
// AC-8 — Ostatnie 4 aktywności z timeline

import { useRouter } from 'next/navigation'
import { timeAgo } from '@/lib/utils/timeAgo'
import type { ActivityEvent } from '@/types/home'

interface RecentActivityProps {
  events:    ActivityEvent[]
  isLoading: boolean
}

// Konfiguracja stylów per entity_type
function entityConfig(entityType: string): {
  bg:    string
  dot:   string
  color: string
  label: string
  avatarBg: string
} {
  switch (entityType) {
    case 'shopping_item':
      return { bg: '#1a3a1a', dot: '#4ade80', color: '#4ade80', label: 'zakupy', avatarBg: 'linear-gradient(135deg, #1a3a1a, #166534)' }
    case 'task':
      return { bg: '#1a2744', dot: '#60a5fa', color: '#60a5fa', label: 'zadanie', avatarBg: 'linear-gradient(135deg, #1a2744, #1e3a6e)' }
    default:
      return { bg: '#3a2a00', dot: '#fbbf24', color: '#fbbf24', label: 'household', avatarBg: 'linear-gradient(135deg, #3a2a00, #78350f)' }
  }
}

// Inicjały aktora
function actorInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? ''
    const b = parts[1]?.[0] ?? ''
    return (a + b).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Czytelny tekst akcji po polsku
function actionText(action: string): string {
  const map: Record<string, string> = {
    shopping_added:    'dodał(a)',
    shopping_bought:   'kupił(a)',
    shopping_deleted:  'usunął(a)',
    task_created:      'stworzył(a) zadanie',
    task_completed:    'ukończył(a)',
    task_moved:        'przesunął(a)',
    task_deleted:      'usunął(a) zadanie',
    member_joined:     'dołączył(a) do rodziny',
    member_invited:    'zaprosił(a)',
    member_removed:    'usunął(a) z rodziny',
  }
  return map[action] ?? action
}

// Skeleton wiersz
function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-3 animate-pulse"
      style={{ height: '48px' }}
      aria-hidden="true"
    >
      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#2a2540', flexShrink: 0 }} />
      <div style={{ flex: 1, height: '12px', background: '#2a2540', borderRadius: '4px' }} />
    </div>
  )
}

interface ActivityRowProps {
  event:    ActivityEvent
  isLast:   boolean
}

function ActivityRow({ event, isLast }: ActivityRowProps) {
  const cfg       = entityConfig(event.entity_type)
  const actor     = event.actor_name ?? 'System'
  const initials  = actorInitials(event.actor_name)
  const entityStr = event.entity_name ? `"${event.entity_name}"` : ''
  const timeStr   = timeAgo(event.created_at)

  return (
    <div className="flex items-start gap-3 relative">
      {/* Pionowa linia timeline */}
      {!isLast && (
        <div
          style={{
            position:   'absolute',
            left:       '10px',
            top:        '22px',
            width:      '1px',
            bottom:     '-12px',
            background: '#2a2540',
          }}
          aria-hidden="true"
        />
      )}

      {/* Avatar aktora */}
      <div
        style={{
          width:        '22px',
          height:       '22px',
          borderRadius: '50%',
          background:   cfg.avatarBg,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     '8px',
          color:        '#fff',
          fontWeight:   700,
          flexShrink:   0,
          zIndex:       1,
        }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Treść */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', color: '#e6edf3', lineHeight: '1.4' }}>
          <strong>{actor}</strong>{' '}
          {actionText(event.action)}{' '}
          {entityStr}
        </p>

        <div className="flex items-center gap-2 mt-1">
          {/* Tag kategorii */}
          <span
            style={{
              fontSize:     '9px',
              color:        cfg.color,
              background:   cfg.bg,
              padding:      '2px 6px',
              borderRadius: '5px',
            }}
          >
            {cfg.label}
          </span>
          {/* Timestamp relatywny */}
          <span style={{ fontSize: '10px', color: '#4b4569' }}>{timeStr}</span>
        </div>
      </div>
    </div>
  )
}

export function RecentActivity({ events, isLoading }: RecentActivityProps) {
  const router = useRouter()

  return (
    <section
      style={{
        background:   '#1a1730',
        border:       '1px solid #2a2540',
        borderRadius: '10px',
        padding:      '16px',
      }}
      aria-label="Ostatnia aktywność"
    >
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>
          📡 Ostatnia aktywność
        </div>
        <button
          onClick={() => router.push('/home/activity')}
          style={{
            fontSize:   '11px',
            color:      '#818cf8',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            fontWeight: 500,
          }}
          className="focus:outline-none focus:ring-2 focus:ring-[#818cf8] rounded"
        >
          Pełny feed →
        </button>
      </div>

      {/* Zawartość */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <p style={{ color: '#4b4569', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
          Brak aktywności w tym dniu
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event, idx) => (
            <ActivityRow
              key={event.id}
              event={event}
              isLast={idx === events.length - 1}
            />
          ))}
        </div>
      )}
    </section>
  )
}
