import { cn } from '@/lib/utils';

interface BoardSkeletonProps {
  columns?: number;
  className?: string;
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-3">
      {/* Priority badge */}
      <div className="mb-2 flex gap-1">
        <div className="h-5 w-14 rounded-full bg-gray-200" />
        <div className="h-5 w-10 rounded-full bg-gray-200" />
      </div>
      {/* Title */}
      <div className="mb-2 space-y-1">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-1/2 rounded bg-gray-200" />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 rounded bg-gray-100" />
        <div className="h-6 w-6 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

function ColumnSkeleton({ cardsCount }: { cardsCount: number }) {
  return (
    <div className="flex-1 min-w-[280px]">
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-6 w-6 animate-pulse rounded bg-gray-200" />
      </div>
      {/* Cards */}
      <div className="space-y-3">
        {Array.from({ length: cardsCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton({ columns = 3, className }: BoardSkeletonProps) {
  // Różna ilość kart w kolumnach — bardziej realistyczne
  const cardCounts = columns === 3 ? [2, 3, 1] : [1, 2, 3, 1];

  return (
    <div className={cn('flex gap-4', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <ColumnSkeleton key={i} cardsCount={cardCounts[i] ?? 2} />
      ))}
    </div>
  );
}
