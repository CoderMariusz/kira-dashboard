'use client'

// components/home/kanban/TaskCard.tsx
// Karta zadania — dark theme, priorytet, avatar — AC-3

import type { Task } from '@/types/home'

// ═══════════════════════════════════════════════════════════
// Stałe
// ═══════════════════════════════════════════════════════════

const PRIORITY_STYLES: Record<
  string,
  { emoji: string; label: string; bg: string; color: string }
> = {
  urgent: { emoji: '🔴', label: 'Pilne',   bg: '#3a1a1a', color: '#f87171' },
  high:   { emoji: '🟠', label: 'Wysoki',  bg: '#3a2a00', color: '#fbbf24' },
  medium: { emoji: '🟡', label: 'Normalne',bg: '#2a2a00', color: '#e3b341' },
  low:    { emoji: '🟢', label: 'Niski',   bg: '#1a3a1a', color: '#4ade80' },
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#ec4899,#f97316)',
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#a78bfa,#60a5fa)',
  'linear-gradient(135deg,#34d399,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
]

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function getAvatarColor(userId: string): string {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const idx = hash % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx] ?? 'linear-gradient(135deg,#ec4899,#f97316)'
}

function getInitials(userId: string): string {
  // Użyj pierwszych 2 znaków user_id jako placeholder inicjałów
  return userId.slice(0, 2).toUpperCase()
}

function formatDueDate(dateStr: string): { text: string; isOverdue: boolean } {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return { text: 'Dzisiaj', isOverdue: false }
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return { text: 'Jutro', isOverdue: false }
  }
  if (date < today) {
    return {
      text: date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
      isOverdue: true,
    }
  }
  return {
    text: date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
    isOverdue: false,
  }
}

// ═══════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════

interface TaskCardProps {
  task: Task
  onClick?: () => void
  isDragging?: boolean
  isGhost?: boolean
  isDone?: boolean
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function TaskCard({ task, onClick, isDragging, isGhost, isDone }: TaskCardProps) {
  const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES['medium']!

  const dueDate = task.due_date ? formatDueDate(task.due_date) : null

  const handleClick = (e: React.MouseEvent) => {
    // Nie otwieraj modala gdy użytkownik drag-uje
    if (isDragging) return
    e.stopPropagation()
    onClick?.()
  }

  return (
    <article
      role="article"
      onClick={handleClick}
      className={[
        'bg-[#13111c] border border-[#2a2540] rounded-[8px] p-[10px] cursor-pointer',
        'shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
        'hover:shadow-[0_3px_12px_rgba(0,0,0,0.4)] hover:border-[#4b3d7a] hover:-translate-y-px',
        'transition-all duration-150 select-none',
        isDragging ? 'rotate-[2deg] opacity-90 shadow-[0_3px_12px_rgba(0,0,0,0.5)]' : '',
        isGhost ? 'opacity-30' : '',
        isDone ? 'opacity-70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Wiersz 1: Priorytet + Label (AC-3) */}
      <div className="flex items-center gap-[6px] mb-[6px] flex-wrap">
        <span
          className="text-[10px] font-semibold px-[6px] py-[2px] rounded-[4px]"
          style={{ background: priority.bg, color: priority.color }}
        >
          {priority.emoji} {priority.label}
        </span>
        {task.label && (
          <span
            className="text-[10px] font-medium px-[6px] py-[2px] rounded-[4px]"
            style={{ background: '#1e2a3a', color: '#60a5fa', border: '1px solid #2a3a5a' }}
          >
            🏷️ {task.label}
          </span>
        )}
      </div>

      {/* Wiersz 2: Tytuł */}
      <h3
        className="text-[13px] font-semibold leading-snug mb-[6px]"
        style={{
          color: isDone ? '#4b4569' : '#e6edf3',
          textDecoration: isDone ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </h3>

      {/* Wiersz 3: Metadane */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          {dueDate && (
            <span
              className={`text-[10px] flex items-center gap-[3px] ${
                dueDate.isOverdue ? 'text-[#f87171] font-semibold' : 'text-[#6b7280]'
              }`}
            >
              📅 {dueDate.text}
            </span>
          )}
        </div>

        {/* Avatar przypisanego */}
        {task.assigned_to && (
          <div
            className="w-[20px] h-[20px] rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
            style={{ background: getAvatarColor(task.assigned_to) }}
            title={`Przypisano do: ${task.assigned_to.slice(0, 8)}...`}
            aria-label={`Przypisano do użytkownika`}
          >
            {getInitials(task.assigned_to)}
          </div>
        )}
      </div>
    </article>
  )
}
