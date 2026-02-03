'use client';

import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PriorityBadge } from './PriorityBadge';
import { LabelBadge } from './LabelBadge';
import { cn } from '@/lib/utils';
import type { TaskWithAssignee, TaskPriority } from '@/lib/types/app';

interface TaskCardProps {
  task: TaskWithAssignee;
  onClick?: () => void;
  /** Czy karta jest aktualnie przeciągana (drag overlay) */
  isDragging?: boolean;
  /** Czy karta jest "ghost" (placeholder w oryginalnej pozycji podczas drag) */
  isGhost?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════
// HELPER: Formatowanie daty
// ═══════════════════════════════════════════════════════════

function formatDueDate(dateStr: string): { text: string; isOverdue: boolean } {
  const date = new Date(dateStr);

  if (isToday(date)) return { text: 'Dzisiaj', isOverdue: false };
  if (isTomorrow(date)) return { text: 'Jutro', isOverdue: false };
  if (isPast(date)) return { text: format(date, 'd MMM', { locale: pl }), isOverdue: true };
  return { text: format(date, 'd MMM', { locale: pl }), isOverdue: false };
}

// ═══════════════════════════════════════════════════════════
// HELPER: Inicjały dla avatar
// ═══════════════════════════════════════════════════════════

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function TaskCard({
  task,
  onClick,
  isDragging,
  isGhost,
  className,
}: TaskCardProps) {
  // Subtask progress
  const subtasks = (task.subtasks as Array<{ title: string; done: boolean }>) ?? [];
  const subtasksDone = subtasks.filter((s) => s.done).length;
  const subtasksTotal = subtasks.length;

  // Due date
  const dueDate = task.due_date ? formatDueDate(task.due_date) : null;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer border bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'rotate-2 opacity-90 shadow-lg',
        isGhost && 'opacity-30',
        className
      )}
    >
      {/* Row 1: Priority + Labels */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <PriorityBadge priority={task.priority as TaskPriority} />
        {((task.labels as string[]) ?? []).slice(0, 3).map((label) => (
          <LabelBadge key={label} label={label} />
        ))}
      </div>

      {/* Row 2: Title */}
      <h3 className="mb-2 text-sm font-medium leading-snug text-gray-900">
        {task.title}
      </h3>

      {/* Row 3: Metadata (due date, subtasks, assignee) */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {/* Due date */}
          {dueDate && (
            <span
              className={cn(
                'flex items-center gap-1',
                dueDate.isOverdue && 'font-medium text-red-600'
              )}
            >
              <Calendar className="h-3 w-3" />
              {dueDate.text}
            </span>
          )}

          {/* Subtask progress */}
          {subtasksTotal > 0 && (
            <span className="flex items-center gap-1">
              ☑ {subtasksDone}/{subtasksTotal}
            </span>
          )}
        </div>

        {/* Assignee avatar */}
        {task.assignee && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-blue-100 text-[10px] text-blue-700">
              {getInitials(task.assignee.display_name)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* No assignee */}
        {!task.assignee && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-300">
            <User className="h-3 w-3 text-gray-400" />
          </div>
        )}
      </div>
    </Card>
  );
}
