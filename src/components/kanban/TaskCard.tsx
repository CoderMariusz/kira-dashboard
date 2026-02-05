'use client';

import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RESPONSIVE_TEXT } from '@/lib/constants/responsive';
import { PriorityBadge } from './PriorityBadge';
import { LabelBadge } from './LabelBadge';
import { cn } from '@/lib/utils';
import type { TaskWithAssignee, TaskPriority, Label } from '@/lib/types/app';

interface TaskCardProps {
  task: Omit<TaskWithAssignee, 'labels'> & { labels?: Label[] | string[] };
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
      role="article"
      onClick={onClick}
      className={cn(
        'cursor-pointer border bg-white p-2 sm:p-3 shadow-sm transition-shadow hover:shadow-md overflow-hidden whitespace-normal',
        isDragging && 'rotate-2 opacity-90 shadow-lg',
        isGhost && 'opacity-30',
        className
      )}
    >
      {/* Row 1: Priority + Labels */}
      <div className={cn("mb-1 sm:mb-2 flex flex-wrap items-center gap-1", RESPONSIVE_TEXT.SMALL)}>
        <PriorityBadge priority={task.priority as TaskPriority} />
        {(task.labels ?? []).slice(0, 3).map((label) =>
          typeof label === 'string' ? null : (
            <LabelBadge key={label.id} label={label} />
          )
        )}
      </div>

      {/* Row 2: Title */}
      <h3 className={cn("mb-1 sm:mb-2 font-medium leading-snug text-gray-900 text-sm sm:text-base")}>
        {task.title}
      </h3>

      {/* Row 2.5: Description — hidden on small phones, shown on sm+ */}
      {task.description && (
        <p className={cn("mb-1 sm:mb-2 text-gray-600 text-xs sm:text-sm line-clamp-2")}>
          {task.description}
        </p>
      )}

      {/* Row 3: Metadata (due date, subtasks, assignee) */}
      <div className="flex items-center justify-between text-gray-500">
        <div className={cn("flex items-center gap-3", RESPONSIVE_TEXT.SMALL)}>
          {/* Due date */}
          {dueDate && (
            <span
              data-due-date={task.due_date}
              className={cn("flex items-center gap-1", RESPONSIVE_TEXT.SMALL, dueDate.isOverdue && "font-medium text-red-600")}
            >
              <Calendar className="h-3 w-3" />
              <span className="sm:hidden">{dueDate.text}</span>
              <span className="hidden sm:inline">{dueDate.text} ({task.due_date})</span>
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
