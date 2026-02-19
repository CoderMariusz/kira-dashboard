'use client'

import { memo, useMemo, useState } from 'react'
import { ShoppingItemRow } from './ShoppingItem'
import type { ShoppingItem as ShoppingItemType } from '@/types/home'

// ──────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────
interface BoughtSectionProps {
  items: ShoppingItemType[]
  onToggle: (itemId: string, currentValue: boolean) => void
  onDelete: (itemId: string) => void
  isToggling: string | null
}

// ──────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────
export const BoughtSection = memo(function BoughtSection({
  items,
  onToggle,
  onDelete,
  isToggling,
}: BoughtSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // Filter bought items
  const boughtItems = useMemo(
    () => items.filter(i => i.is_bought),
    [items]
  )

  // Return null when no bought items
  if (boughtItems.length === 0) return null

  // Handle clearing all bought items
  const handleClear = async () => {
    if (!confirm('Usunąć wszystkie kupione produkty?')) return

    setIsClearing(true)
    try {
      // Delete all bought items sequentially
      for (const item of boughtItems) {
        await onDelete(item.id)
      }
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="mt-6 bg-[#1a1730] border border-[#2a2540] rounded-[10px] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-[10px] px-[14px] py-[11px] w-full hover:bg-[#2a2540] transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-[16px]">✅</span>
        <span className="text-[13px] font-semibold text-[#4b4569] flex-1 text-left">
          Kupione ({boughtItems.length})
        </span>
        <button
          onClick={e => {
            e.stopPropagation()
            handleClear()
          }}
          disabled={isClearing}
          className="text-[11px] text-[#f87171] hover:text-[#fca5a5] disabled:opacity-50 px-2 py-1 rounded bg-[#3a1a1a] hover:bg-[#4a2020]"
        >
          {isClearing ? 'Czyszczenie...' : 'Wyczyść'}
        </button>
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
          {boughtItems.map(item => (
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
