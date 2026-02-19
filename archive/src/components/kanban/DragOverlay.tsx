'use client';

import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import type { TaskWithAssignee } from '@/lib/types/app';

interface TaskDragOverlayProps {
  /** Task aktualnie przeciągany (null jeśli nic nie jest przeciągane) */
  activeTask: TaskWithAssignee | null;
}

export function TaskDragOverlay({ activeTask }: TaskDragOverlayProps) {
  return (
    <DndDragOverlay
      dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}
    >
      {activeTask ? (
        <div className="w-[280px]">
          <TaskCard task={activeTask} isDragging />
        </div>
      ) : null}
    </DndDragOverlay>
  );
}
