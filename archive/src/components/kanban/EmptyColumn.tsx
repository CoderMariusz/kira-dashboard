import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyColumnProps {
  columnLabel: string;
  className?: string;
}

export function EmptyColumn({ columnLabel, className }: EmptyColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6 text-center',
        className
      )}
    >
      <Inbox className="mb-2 h-8 w-8 text-gray-300" />
      <p className="text-sm text-gray-400">
        Brak zadań w &quot;{columnLabel}&quot;
      </p>
      <p className="mt-1 text-xs text-gray-300">
        Przeciągnij tutaj lub kliknij +
      </p>
    </div>
  );
}
