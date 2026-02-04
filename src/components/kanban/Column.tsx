'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { EmptyColumn } from './EmptyColumn';
import { SortableTaskCard } from './SortableTaskCard';
import { QuickAddTask } from './QuickAddTask';
import { cn } from '@/lib/utils';
import type { ColumnConfig, TaskWithAssignee, TaskColumn } from '@/lib/types/app';

interface ColumnProps {
  /** ID boardu — potrzebne do tworzenia tasków */
  boardId: string;
  /** Konfiguracja kolumny z BOARD_COLUMNS */
  config: ColumnConfig;
  /** Taski przypisane do tej kolumny */
  tasks: TaskWithAssignee[];
  /** Callback gdy kliknięto na task card */
  onTaskClick?: (taskId: string) => void;
  className?: string;
}

export function Column({ boardId, config, tasks, onTaskClick, className }: ColumnProps) {
  // ═══ DROPPABLE — pozwala upuszczać taski w tej kolumnie ═══
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${config.key}`,
    data: {
      type: 'column',
      column: config.key,
    },
  });

  // Lista ID tasków — wymagana przez SortableContext
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className={cn('flex w-full md:min-w-[280px] flex-1 flex-col', className)}>
      {/* ═══ COLUMN HEADER ═══ */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">
            {config.label}
          </h2>
          <Badge
            variant="secondary"
            className="h-5 min-w-[20px] justify-center rounded-full px-1.5 text-xs"
          >
            {tasks.length}
          </Badge>
        </div>

        <QuickAddTask boardId={boardId} column={config.key as TaskColumn} />
      </div>

      {/* ═══ COLUMN BODY — droppable + sortable ═══ */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-1 flex-col gap-2 rounded-lg p-2 transition-colors',
            'min-h-[80px] md:min-h-[200px]',
            isOver
              ? 'bg-blue-50/80 ring-2 ring-blue-200'
              : 'bg-gray-50/50'
          )}
        >
          {tasks.length === 0 ? (
            <EmptyColumn columnLabel={config.label} />
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task.id)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
