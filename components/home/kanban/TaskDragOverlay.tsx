'use client'

// components/home/kanban/TaskDragOverlay.tsx
// Karta podążająca za kursorem podczas drag — AC-4

import { DragOverlay } from '@dnd-kit/core'
import { TaskCard } from './TaskCard'
import type { Task } from '@/types/home'

interface TaskDragOverlayProps {
  activeTask: Task | null
}

export function TaskDragOverlay({ activeTask }: TaskDragOverlayProps) {
  return (
    <DragOverlay
      dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}
    >
      {activeTask ? (
        <div
          className="w-[260px]"
          aria-hidden="true"
          style={{
            transform: 'rotate(2deg)',
            opacity: 0.9,
            boxShadow: '0 3px 12px rgba(0,0,0,.5)',
          }}
        >
          <TaskCard task={activeTask} isDragging />
        </div>
      ) : null}
    </DragOverlay>
  )
}
