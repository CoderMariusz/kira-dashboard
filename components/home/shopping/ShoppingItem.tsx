'use client'

import { memo } from 'react'
import type { ShoppingItem as ShoppingItemType } from '@/types/home'

// ──────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────
interface ShoppingItemProps {
  item: ShoppingItemType
  onToggle: (itemId: string, currentValue: boolean) => void
  isToggling?: string | null
}

// ──────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────
export const ShoppingItemRow = memo(function ShoppingItemRow({
  item,
  onToggle,
  isToggling,
}: ShoppingItemProps) {
  const handleToggle = () => {
    onToggle(item.id, item.is_bought)
  }

  return (
    <div className="flex items-center gap-[10px] py-[7px] border-b border-[#1f1c2e] last:border-b-0">
      {/* Checkbox */}
      <button
        role="checkbox"
        aria-checked={item.is_bought}
        aria-label={`Oznacz ${item.name} jako ${item.is_bought ? 'niekupiony' : 'kupiony'}`}
        onClick={handleToggle}
        disabled={isToggling === item.id}
        className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
          item.is_bought
            ? 'bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] border-transparent'
            : 'border-[#3b3d7a] bg-transparent hover:border-[#c4b5fd]'
        } ${isToggling === item.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      >
        {item.is_bought && (
          <span className="text-white text-[10px]">✓</span>
        )}
      </button>

      {/* Name */}
      <span
        className={`text-[12px] flex-1 ${
          item.is_bought ? 'line-through text-[#4b4569]' : 'text-[#e6edf3]'
        }`}
      >
        {item.name}
      </span>

      {/* Quantity */}
      {item.quantity && item.quantity > 1 && (
        <span className="text-[11px] text-[#4b4569]">
          {item.quantity}
          {item.unit ? ` ${item.unit}` : ''}
        </span>
      )}
    </div>
  )
})
