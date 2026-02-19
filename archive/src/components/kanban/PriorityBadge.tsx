import { PRIORITIES } from '@/lib/utils/constants';
import type { TaskPriority } from '@/lib/types/app';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITIES[priority];

  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 font-medium',
        className
      )}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
      }}
      aria-label={`Priority: ${priority}`}
    >
      <span className="text-sm md:text-xs">{config.label} ({priority})</span>
    </span>
  );
}
