'use client'

// components/home/kanban/FilterBar.tsx
// Poziomy pasek chipów filtrujących — AC-7

import type { HouseholdMember } from '@/types/home'

interface FilterBarProps {
  selectedFilter: string
  onFilterChange: (filter: string) => void
  members: HouseholdMember[]
  currentUserId: string | null
}

// HouseholdMember może mieć display_name w runtime (z DB) mimo braku w typie
type MemberWithName = HouseholdMember & { display_name?: string; full_name?: string }

function getMemberLabel(member: HouseholdMember): string {
  const m = member as MemberWithName
  if (m.display_name) return m.display_name
  if (m.full_name) return m.full_name
  // Fallback — skróć user_id do 8 znaków
  return m.user_id.slice(0, 8)
}

export function FilterBar({
  selectedFilter,
  onFilterChange,
  members,
  currentUserId,
}: FilterBarProps) {
  const filters = [
    { key: 'all', label: 'Wszystkie' },
    { key: 'mine', label: 'Moje' },
    ...members
      // Nie pokazuj siebie jako osobnego filtra — jest "Moje"
      .filter(m => m.user_id !== currentUserId)
      .map(m => ({ key: m.user_id, label: getMemberLabel(m) })),
  ]

  return (
    <div
      className="flex gap-[5px] mb-[16px] overflow-x-auto pb-[2px]"
      style={{ scrollbarWidth: 'none' }}
      role="toolbar"
      aria-label="Filtry zadań"
    >
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          className={[
            'px-[12px] py-[5px] text-[11px] rounded-[20px] border whitespace-nowrap transition-colors cursor-pointer select-none',
            selectedFilter === f.key
              ? 'bg-[#2d1b4a] border-[#7c3aed] text-[#c4b5fd] font-semibold'
              : 'bg-[#2a2540] border-[#3b3d7a] text-[#6b7280] hover:text-[#e6edf3]',
          ].join(' ')}
          aria-pressed={selectedFilter === f.key}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
