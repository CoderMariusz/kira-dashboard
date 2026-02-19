'use client'

// components/home/kanban/Column.tsx
// Kolumna kanban — droppable + SortableContext — AC-1, AC-3, AC-4

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableTaskCard } from './SortableTaskCard'
import { QuickAddTask } from './QuickAddTask'
import type { Task } from '@/types/home'

interface ColumnProps {
  columnId: string          // UUID kolumny z DB
  label: string             // Wyświetlana nazwa
  dot: string               // Kolor kropki (hex)
  tasks: Task[]
  onTaskClick: (taskId: string) => void
  onQuickAdd: (title: string) => Promise<void> | void
  /** Czy to kolumna "Gotowe" — karty będą strikethrough */
  isDoneColumn?: boolean
}

export function Column({
  columnId,
  label,
  dot,
  tasks,
  onTaskClick,
  onQuickAdd,
  isDoneColumn,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnId}`,
    data: { type: 'column', columnKey: columnId },
  })

  return (
    <section
      className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-[12px] min-w-[240px] scroll-snap-align-start flex flex-col"
      role="region"
      aria-label={`Kolumna: ${label}`}
    >
      {/* Nagłówek kolumny */}
      <div className="flex items-center gap-[8px] mb-[10px]">
        <div
          className="w-[8px] h-[8px] rounded-full flex-shrink-0"
          style={{ background: dot }}
          aria-hidden="true"
        />
        <span className="text-[12px] font-bold text-[#e6edf3] flex-1">{label}</span>
        <span className="text-[10px] font-semibold bg-[#2a2540] text-[#6b7280] px-[7px] py-[1px] rounded-[8px]">
          {tasks.length}
        </span>
      </div>

      {/* QuickAdd */}
      <QuickAddTask onAdd={onQuickAdd} />

      {/* Droppable + Sortable */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={[
            'flex flex-col gap-[7px] min-h-[80px] rounded-[8px] p-[4px] transition-colors flex-1',
            isOver
              ? 'bg-[rgba(124,58,237,0.1)] border border-[#4b3d7a]'
              : 'bg-transparent',
          ].join(' ')}
        >
          {tasks.length === 0 ? (
            <EmptyColumnHint label={label} />
          ) : (
            tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)}
                isDone={isDoneColumn || !!task.completed_at}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  )
}

function EmptyColumnHint({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[60px] text-[11px] text-[#3d3757] border border-dashed border-[#2a2540] rounded-[6px]">
      Brak zadań w &quot;{label}&quot;
    </div>
  )
}
