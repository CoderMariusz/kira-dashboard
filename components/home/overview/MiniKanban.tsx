'use client'
// components/home/overview/MiniKanban.tsx
// AC-7 — Read-only mini kanban: 3 kolumny, max 2 karty per kolumna

import { useRouter } from 'next/navigation'
import type { ColumnWithTasks, Task } from '@/types/home'

// Fallback kolumn jeśli brak danych z API (EC-2)
const DEFAULT_COLUMNS = [
  { name: 'Do zrobienia', dot: '#6b7280' },
  { name: 'W trakcie',    dot: '#f97316' },
  { name: 'Gotowe',       dot: '#4ade80' },
]

interface MiniKanbanProps {
  columns:   ColumnWithTasks[]
  isLoading: boolean
}

// Kolor assignee avatara (deterministyczny z user_id)
function avatarColor(seed: string | null): string {
  if (!seed) return '#818cf8'
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors: string[] = ['#818cf8', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777']
  return colors[Math.abs(hash) % colors.length] ?? '#818cf8'
}

// Inicjały assignee (max 2 znaki)
function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? ''
    const b = parts[1]?.[0] ?? ''
    return (a + b).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Emoji priorytetu
function priorityEmoji(priority: Task['priority']): string {
  switch (priority) {
    case 'high':   return '🔴'
    case 'urgent': return '🔴'
    case 'medium': return '🟡'
    case 'low':    return '🟢'
    default:       return '🟡'
  }
}

// Skeleton kolumny
function SkeletonColumn() {
  return (
    <div
      style={{
        minWidth:     '120px',
        flex:         1,
        background:   '#1a1730',
        border:       '1px solid #2a2540',
        borderRadius: '8px',
        padding:      '10px',
      }}
      aria-hidden="true"
    >
      <div className="animate-pulse h-3 bg-[#2a2540] rounded mb-3 w-3/4" />
      <div className="space-y-2">
        <div className="animate-pulse h-12 bg-[#2a2540] rounded" />
        <div className="animate-pulse h-12 bg-[#2a2540] rounded" />
      </div>
    </div>
  )
}

interface MiniTaskCardProps {
  task:    Task
  onClick: () => void
}

function MiniTaskCard({ task, onClick }: MiniTaskCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background:   '#13111c',
        border:       '1px solid #2a2540',
        borderRadius: '6px',
        padding:      '8px 10px',
        cursor:       'pointer',
        transition:   'border-color 0.15s',
      }}
      className="hover:border-[#4b3d7a]"
    >
      {/* Tytuł */}
      <div
        style={{
          fontSize:      '11px',
          color:         '#e6edf3',
          fontWeight:    500,
          overflow:      'hidden',
          display:       '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          marginBottom:  '6px',
        }}
      >
        {task.title}
      </div>

      {/* Priorytet + avatar */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: '9px' }}>{priorityEmoji(task.priority)}</span>
        {task.assigned_to && (
          <div
            style={{
              width:        '16px',
              height:       '16px',
              borderRadius: '50%',
              background:   avatarColor(task.assigned_to),
              fontSize:     '7px',
              color:        '#fff',
              fontWeight:   700,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
            }}
          >
            {initials(task.assigned_to)}
          </div>
        )}
      </div>
    </div>
  )
}

export function MiniKanban({ columns, isLoading }: MiniKanbanProps) {
  const router = useRouter()

  const goToTasks = () => router.push('/home/tasks')

  // Pierwsza 3 kolumny posortowane po position
  const first3 = [...columns]
    .sort((a, b) => a.position - b.position)
    .slice(0, 3)

  return (
    <section
      style={{
        background:   '#1a1730',
        border:       '1px solid #2a2540',
        borderRadius: '10px',
        padding:      '16px',
      }}
      aria-label="Podgląd tablicy zadań (tylko do odczytu)"
    >
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>
          📋 Zadania — podgląd
        </div>
        <button
          onClick={goToTasks}
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
          Otwórz tablicę →
        </button>
      </div>

      {/* Zawartość */}
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonColumn key={i} />)}
        </div>
      ) : columns.length === 0 ? (
        // EC-2: brak danych columns
        <button
          onClick={goToTasks}
          style={{ color: '#818cf8', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Otwórz tablicę, aby zobaczyć zadania →
        </button>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {first3.map((col, idx) => {
            const dot: string = DEFAULT_COLUMNS[idx]?.dot ?? '#6b7280'
            const topTasks = [...col.tasks]
              .sort((a, b) => a.position - b.position)
              .slice(0, 2)

            return (
              <div
                key={col.id}
                style={{
                  minWidth:     '140px',
                  flex:         1,
                  background:   '#13111c',
                  border:       '1px solid #2a2540',
                  borderRadius: '8px',
                  padding:      '10px',
                }}
              >
                {/* Nagłówek kolumny */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    style={{
                      width:        '6px',
                      height:       '6px',
                      borderRadius: '50%',
                      background:   dot,
                      flexShrink:   0,
                    }}
                  />
                  <span
                    style={{
                      fontSize:      '10px',
                      color:         '#6b7280',
                      textTransform: 'uppercase',
                      fontWeight:    600,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {col.name}
                  </span>
                </div>

                {/* Karty zadań */}
                {topTasks.length === 0 ? (
                  <p style={{ color: '#4b4569', fontSize: '10px', textAlign: 'center', padding: '8px 0' }}>
                    Brak zadań
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topTasks.map(task => (
                      <MiniTaskCard key={task.id} task={task} onClick={goToTasks} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
