'use client';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export type ActivityFilter = 'all' | 'shopping' | 'task' | 'household';

export interface ActivityFilterChipsProps {
  activeFilter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
}

// ══════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════

const FILTER_OPTIONS: { key: ActivityFilter; label: string }[] = [
  { key: 'all',       label: 'Wszystkie' },
  { key: 'shopping',  label: 'Zakupy' },
  { key: 'task',      label: 'Zadania' },
  { key: 'household', label: 'Household' },
];

// ══════════════════════════════════════════════════════════
// COMPONENT: ActivityFilterChips
// ══════════════════════════════════════════════════════════

/**
 * AC-7: ActivityFilters — filter chips horizontal scroll
 * AC-8: Filtrowanie — zmiana filtru przeładowuje feed
 */
export function ActivityFilterChips({ activeFilter, onFilterChange }: ActivityFilterChipsProps) {
  return (
    <div
      className="flex gap-[7px] overflow-x-auto pb-[2px] mb-[16px]"
      style={{ 
        scrollbarWidth: 'none', 
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollSnapType: 'x mandatory',
      }}
      role="group"
      aria-label="Filtry aktywności"
    >
      {FILTER_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onFilterChange(opt.key)}
          aria-pressed={activeFilter === opt.key}
          className={`
            flex items-center px-[14px] py-[6px] text-[11px] rounded-[20px] border
            whitespace-nowrap transition-colors cursor-pointer flex-shrink-0
            min-h-[32px]
            ${activeFilter === opt.key
              ? 'bg-[#2d1b4a] border-[#7c3aed] text-[#c4b5fd] font-semibold'
              : 'bg-[#2a2540] border-[#3b3d7a] text-[#6b7280] hover:text-[#e6edf3]'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
      
      {/* Hide scrollbar via CSS */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
