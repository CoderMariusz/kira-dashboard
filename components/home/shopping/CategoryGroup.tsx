'use client'

import { memo, useState, useMemo } from 'react'
import { ShoppingItemRow } from './ShoppingItem'
import type { ShoppingItem as ShoppingItemType } from '@/types/home'

// ──────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────
interface CategoryGroupProps {
  categoryName: string
  categoryIcon?: string
  items: ShoppingItemType[]
  onToggle: (itemId: string, currentValue: boolean) => void
  isToggling: string | null
}

// ──────────────────────────────────────────────────
// Default icons for known categories
// ──────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  'Nabiał': '🥛',
  'Owoce': '🍎',
  'Warzywa': '🥬',
  'Mięso': '🥩',
  'Pieczywo': '🍞',
  'Napoje': '🥤',
  'Słodycze': '🍫',
  'Mrożonki': '🧊',
  'Chemia': '🧴',
  'Higiena': '🧼',
  'Dla domu': '🏠',
  'Inne': '📦',
}

// ──────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────
export const CategoryGroup = memo(function CategoryGroup({
  categoryName,
  categoryIcon,
  items,
  onToggle,
  isToggling,
}: CategoryGroupProps) {
  const [isOpen, setIsOpen] = useState(true)

  // Filter out bought items
  const activeItems = useMemo(
    () => items.filter(i => !i.is_bought),
    [items]
  )

  // Return null when no active items
  if (activeItems.length === 0) return null

  // Get icon for category
  const icon = categoryIcon ?? CATEGORY_ICONS[categoryName] ?? '📦'

  return (
    <div className="mb-[10px] bg-[#1a1730] border border-[#2a2540] rounded-[10px] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-[10px] px-[14px] py-[11px] w-full hover:bg-[#2a2540] transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-[16px]">{icon}</span>
        <span className="text-[13px] font-semibold text-[#e6edf3] flex-1 text-left">
          {categoryName}
        </span>
        <span className="text-[11px] text-[#4b4569] bg-[#13111c] px-2 py-[2px] rounded-[8px]">
          {activeItems.length}
        </span>
        <span
          className={`text-[10px] text-[#4b4569] transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
        >
          ›
        </span>
      </button>

      {/* Items */}
      {isOpen && (
        <div className="px-[14px] pb-[10px] border-t border-[#2a2540]">
          {activeItems.map(item => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              isToggling={isToggling}
            />
          ))}
        </div>
      )}
    </div>
  )
})
