'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ShoppingItem } from '@/types/home'
import { AddCategoryModal } from './AddCategoryModal'

// ──────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────
interface AddItemFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; category: string; quantity: number; unit?: string | null }) => Promise<void>
  isSubmitting: boolean
  existingItems: ShoppingItem[]
  onAddCategory?: (name: string) => Promise<void>
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
// Helper: parse quantity text into number + unit
// e.g. "2 szt" → { quantity: 2, unit: "szt" }
//      "500g"  → { quantity: 500, unit: "g" }
//      "kilka" → { quantity: 1, unit: "kilka" }
// ──────────────────────────────────────────────────
function parseQuantityText(text: string): { quantity: number; unit: string | null } {
  const trimmed = text.trim()
  if (!trimmed) return { quantity: 1, unit: null }
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if (match && match[1] !== undefined) {
    const num = parseFloat(match[1].replace(',', '.'))
    const unit = (match[2] ?? '').trim() || null
    return { quantity: isNaN(num) || num <= 0 ? 1 : num, unit }
  }
  return { quantity: 1, unit: trimmed || null }
}

// ──────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────
export function AddItemForm({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  existingItems,
  onAddCategory,
}: AddItemFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Inne')
  const [quantityText, setQuantityText] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)

  // Extract unique categories from existing items + defaults + extra
  const availableCategories = useMemo(() => {
    const existingCategories = new Set(existingItems.map(i => i.category))
    const all = [...DEFAULT_CATEGORIES]

    // Add any custom categories from existing items
    for (const cat of existingCategories) {
      if (!all.some(c => c.name === cat)) {
        all.push({ name: cat, icon: '📦' })
      }
    }

    // Add locally added extra categories
    for (const cat of extraCategories) {
      if (!all.some(c => c.name === cat)) {
        all.push({ name: cat, icon: '🏷️' })
      }
    }

    return all
  }, [existingItems, extraCategories])

  // Reset form
  const resetForm = useCallback(() => {
    setName('')
    setCategory('Inne')
    setQuantityText('1')
    setError(null)
  }, [])

  // Handle close
  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // Handle adding a new category from the modal
  const handleAddCategory = useCallback(async (newCat: string) => {
    // Call parent hook if provided
    if (onAddCategory) {
      await onAddCategory(newCat)
    }
    // Add to local extra categories for immediate display
    setExtraCategories(prev => {
      if (prev.includes(newCat)) return prev
      return [...prev, newCat]
    })
    // Auto-select the new category
    setCategory(newCat)
    setIsAddCategoryOpen(false)
  }, [onAddCategory])

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) return

    setError(null)

    const { quantity, unit } = parseQuantityText(quantityText)

    try {
      await onSubmit({
        name: trimmedName,
        category,
        quantity,
        unit,
      })
      resetForm()
      onClose()
    } catch (err) {
      setError('Nie udało się dodać produktu. Spróbuj ponownie.')
      console.warn('[AddItemForm] Submit error:', err)
    }
  }

  // Handle select change — detect "add category" sentinel
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__add_category__') {
      setIsAddCategoryOpen(true)
      // Reset select to current category (don't change until modal confirms)
      e.target.value = category
    } else {
      setCategory(e.target.value)
    }
  }, [category])

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !isAddCategoryOpen) {
        handleClose()
      }
    },
    [handleClose, isAddCategoryOpen]
  )

  // Don't render if not open
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
        onKeyDown={handleKeyDown}
        onClick={e => {
          if (e.target === e.currentTarget && !isAddCategoryOpen) handleClose()
        }}
      >
        <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-[14px] p-6 w-full max-w-md shadow-xl">
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
                onChange={handleCategoryChange}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#13111c] border border-[#2a2540] rounded-lg text-[#e6edf3] focus:border-[#7c3aed] focus:outline-none transition-colors disabled:opacity-50"
              >
                {availableCategories.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
                <option value="__add_category__">➕ Dodaj kategorię</option>
              </select>
            </div>

            {/* Combined Quantity field (AC-7) */}
            <div className="mb-4">
              <label
                htmlFor="item-quantity"
                className="block text-[12px] font-medium text-[#e6edf3] mb-1"
              >
                Ilość (np. 2 szt, 1 kg)
              </label>
              <input
                id="item-quantity"
                type="text"
                value={quantityText}
                onChange={e => setQuantityText(e.target.value)}
                placeholder="2 szt, 1 kg"
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-[#13111c] border border-[#2a2540] rounded-lg text-[#e6edf3] placeholder-[#4b4569] focus:border-[#7c3aed] focus:outline-none transition-colors disabled:opacity-50"
              />
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

      {/* Add Category Modal — z-index above AddItemForm */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onAdd={handleAddCategory}
      />
    </>
  )
}
