'use client';

import { Badge } from '@/components/ui/badge';
import { EmptyColumn } from './EmptyColumn';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import type { ColumnConfig, TaskWithAssignee } from '@/lib/types/app';

interface ColumnProps {
  /** Konfiguracja kolumny z BOARD_COLUMNS */
  config: ColumnConfig;
  /** Taski przypisane do tej kolumny */
  tasks: TaskWithAssignee[];
  /** Callback gdy kliknięto na task card */
  onTaskClick?: (taskId: string) => void;
  className?: string;
}

export function Column({ config, tasks, onTaskClick, className }: ColumnProps) {
  return (
    <div className={cn('flex min-w-[280px] flex-1 flex-col', className)}>
      {/* ═══ COLUMN HEADER ═══ */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">{config.label}</h2>
          <Badge
            variant="secondary"
            className="h-5 min-w-[20px] justify-center rounded-full px-1.5 text-xs"
          >
            {tasks.length}
          </Badge>
        </div>

        {/* Placeholder dla przycisku "+" — zostanie dodany w US-2.3 */}
        <div className="h-7 w-7" />
      </div>

      {/* ═══ COLUMN BODY — lista kart ═══ */}
      <div
        className={cn(
          'flex flex-1 flex-col gap-2 rounded-lg bg-gray-50/50 p-2',
          'min-h-[200px]'
        )}
      >
        {tasks.length === 0 ? (
          <EmptyColumn columnLabel={config.label} />
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
