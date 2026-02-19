'use client'

// components/home/kanban/SortableTaskCard.tsx
// Wrapper useSortable + TaskCard — AC-4

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import type { Task } from '@/types/home'

interface SortableTaskCardProps {
  task: Task
  onClick: () => void
  isDone?: boolean
}

export function SortableTaskCard({ task, onClick, isDone }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        onClick={onClick}
        isGhost={isDragging}
        isDragging={isDragging}
        isDone={isDone}
      />
    </div>
  )
}
