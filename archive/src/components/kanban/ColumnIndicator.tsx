'use client';

/**
 * Props for ColumnIndicator component
 */
interface ColumnIndicatorProps {
  /** Currently visible column index */
  activeIndex: number;
  /** Total number of columns */
  total: number;
}

/**
 * Mobile-only dot indicators for Kanban column navigation
 */
export function ColumnIndicator({ activeIndex, total }: ColumnIndicatorProps) {
  return (
    <div className="flex justify-center gap-2 md:hidden">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          className={`h-2 w-2 rounded-full ${
            index === activeIndex ? 'bg-blue-600' : 'bg-gray-300'
          }`}
          aria-label={`Go to column ${index + 1}`}
        />
      ))}
    </div>
  );
}
