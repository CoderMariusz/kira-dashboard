import { cn } from '@/lib/utils';
import { BOARD_LAYOUT, RESPONSIVE_TEXT } from '@/lib/constants/responsive';

interface BoardSkeletonProps {
  columns?: number;
  className?: string;
}

function CardSkeleton() {
  return (
    <span className="block animate-pulse rounded-lg border bg-white p-3" role="article">
      {/* Priority badge */}
      <span className="mb-2 flex gap-1 block">
        <span className="h-5 w-14 rounded-full bg-gray-200 block" />
        <span className="h-5 w-10 rounded-full bg-gray-200 block" />
      </span>
      {/* Title */}
      <span className="mb-2 block space-y-1">
        <span className="h-4 w-3/4 rounded bg-gray-200 block" />
        <span className="h-4 w-1/2 rounded bg-gray-200 block" />
      </span>
      {/* Footer */}
      <span className="flex items-center justify-between block">
        <span className="h-3 w-16 rounded bg-gray-100 block" />
        <span className="h-6 w-6 rounded-full bg-gray-200 block" />
      </span>
    </span>
  );
}

function ColumnSkeleton({ cardsCount }: { cardsCount: number }) {
  return (
    <span className={BOARD_LAYOUT.COLUMN}>
      {/* Column header */}
      <span className="mb-3 flex items-center justify-between block">
        <span className="h-6 w-32 animate-pulse rounded bg-gray-200 block" />
        <span className="h-6 w-6 animate-pulse rounded bg-gray-200 block" />
      </span>
      {/* Cards */}
      <span className="block space-y-3">
        {Array.from({ length: cardsCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </span>
    </span>
  );
}

export function BoardSkeleton({ columns = 3, className }: BoardSkeletonProps) {
  // Różna ilość kart w kolumnach — bardziej realistyczne
  const cardCounts = columns === 3 ? [2, 3, 1] : [1, 2, 3, 1];

  return (
    <div data-testid="kanban-board" className={cn(BOARD_LAYOUT.CONTAINER, className)}>
      <h1 className={cn(RESPONSIVE_TEXT.DIALOG_TITLE, "sr-only")}>Loading Board</h1>
      {Array.from({ length: columns }).map((_, i) => (
        <ColumnSkeleton key={i} cardsCount={cardCounts[i] ?? 2} />
      ))}
    </div>
  );
}
