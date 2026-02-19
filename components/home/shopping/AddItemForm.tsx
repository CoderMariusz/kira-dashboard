'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ShoppingItem } from '@/types/home'

// ──────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────
interface AddItemFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; category: string; quantity: number; unit?: string | null }) => Promise<void>
  isSubmitting: boolean
  existingItems: ShoppingItem[]
}

// ──────────────────────────────────────────────────
// Default categories with icons
// ──────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: 'Nabiał', icon: '🥛' },
  { name: 'Owoce', icon: '🍎' },
  { name: 'Warzywa', icon: '🥬' },
  { name: 'Mięso', icon: '🥩' },
  { name: 'Pieczywo', icon: '🍞' },
  { name: 'Napoje', icon: '🥤' },
  { name: 'Słodycze', icon: '🍫' },
  { name: 'Mrożonki', icon: '🧊' },
  { name: 'Chemia', icon: '🧴' },
  { name: 'Higiena', icon: '🧼' },
  { name: 'Dla domu', icon: '🏠' },
  { name: 'Inne', icon: '📦' },
]

// ──────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────
export function AddItemForm({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  existingItems,
}: AddItemFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Inne')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Extract unique categories from existing items + defaults
  const availableCategories = useMemo(() => {
    const existingCategories = new Set(existingItems.map(i => i.category))
    const all = [...DEFAULT_CATEGORIES]

    // Add any custom categories from existing items
    for (const cat of existingCategories) {
      if (!all.some(c => c.name === cat)) {
        all.push({ name: cat, icon: '📦' })
      }
    }

    return all
  }, [existingItems])

  // Reset form
  const resetForm = useCallback(() => {
    setName('')
    setCategory('Inne')
    setQuantity('1')
    setUnit('')
    setError(null)
  }, [])

  // Handle close
  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) return

    setError(null)

    try {
      await onSubmit({
        name: trimmedName,
        category,
        quantity: parseInt(quantity) || 1,
        unit: unit.trim() || null,
      })
      resetForm()
      onClose()
    } catch (err) {
      setError('Nie udało się dodać produktu. Spróbuj ponownie.')
      console.error('[AddItemForm] Submit error:', err)
    }
  }

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleClose]
  )

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-title"
      onKeyDown={handleKeyDown}
      onClick={e => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="bg-[#1a1730] border border-[#2a2540] rounded-[14px] p-6 w-full max-w-md shadow-xl">
        <h2
          id="add-item-title"
          className="text-[16px] font-semibold text-[#e6edf3] mb-4"
        >
          Dodaj produkt
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Name field */}
          <div className="mb-4">
            <label
              htmlFor="item-name"
              className="block text-[12px] font-medium text-[#e6edf3] mb-1"
            >
              Nazwa produktu
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="np. Mleko 2%"
              maxLength={200}
              disabled={isSubmitting}
              required
              autoFocus
              className="w-full px-3 py-2 bg-[#13111c] border border-[#2a2540] rounded-lg text-[#e6edf3] placeholder-[#4b4569] focus:border-[#7c3aed] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Category field */}
          <div className="mb-4">
            <label
              htmlFor="item-category"
              className="block text-[12px] font-medium text-[#e6edf3] mb-1"
            >
              Kategoria
            </label>
            <select
              id="item-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-[#13111c] border border-[#2a2540] rounded-lg text-[#e6edf3] focus:border-[#7c3aed] focus:outline-none transition-colors disabled:opacity-50"
            >
              {availableCategories.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity and Unit fields */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="item-quantity"
                className="block text-[12px] font-medium text-[#e6edf3] mb-1"
              >
                Ilość
              </label>
              <input
                id="item-quantity"
                type="number"
                min="1"
                max="9999"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#13111c] border border-[#2a2540] rounded-lg text-[#e6edf3] focus:border-[#7c3aed] focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label
                htmlFor="item-unit"
                className="block text-[12px] font-medium text-[#e6edf3] mb-1"
              >
                Jednostka
              </label>
              <input
                id="item-unit"
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="np. kg, szt"
                maxLength={20}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#13111c] border border-[#2a2540] rounded-lg text-[#e6edf3] placeholder-[#4b4569] focus:border-[#7c3aed] focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mb-4 p-3 bg-[#3a1a1a] text-[#f87171] rounded-lg text-[12px]"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#2a2540] text-[#e6edf3] rounded-lg hover:bg-[#3b3d7a] transition-colors disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Dodawanie...' : 'Dodaj do listy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
