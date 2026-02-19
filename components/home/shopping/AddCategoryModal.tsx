'use client'

import { useState, useCallback } from 'react'

// ──────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────
interface AddCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string) => Promise<void>
}

// ──────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────
export function AddCategoryModal({ isOpen, onClose, onAdd }: AddCategoryModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = useCallback(() => {
    setName('')
    setError(null)
    onClose()
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError('Nazwa kategorii nie może być pusta')
      return
    }
    if (trimmed.length > 50) {
      setError('Nazwa kategorii może mieć maksymalnie 50 znaków')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await onAdd(trimmed)
      setName('')
      onClose()
    } catch {
      setError('Nie udało się dodać kategorii')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    },
    [handleClose]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={e => {
        if (e.target === e.currentTarget) handleClose()
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-category-title"
    >
      <div
        className="bg-[#1a1730] border border-[#3b3d7a] rounded-[14px] p-6 w-full max-w-sm shadow-xl"
        style={{ backdropFilter: 'none' }}
      >
        <h2
          id="add-category-title"
          className="text-[16px] font-semibold text-[#e6edf3] mb-4"
        >
          Dodaj kategorię
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="category-name"
              className="block text-[12px] font-medium text-[#e6edf3] mb-1"
            >
              Nazwa kategorii
            </label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="np. Kosmetyki"
              maxLength={50}
              disabled={isSubmitting}
              required
              autoFocus
              className="w-full px-3 py-2 bg-[#13111c] border border-[#3b3d7a] rounded-lg text-[#e6edf3] placeholder-[#4b4569] focus:border-[#7c3aed] focus:outline-none transition-colors disabled:opacity-50"
            />
            <p className="text-[10px] text-[#4b4569] mt-1">
              Maksymalnie 50 znaków ({50 - name.length} pozostało)
            </p>
          </div>

          {error && (
            <div
              className="mb-4 p-3 bg-[#3a1a1a] text-[#f87171] rounded-lg text-[12px]"
              role="alert"
            >
              {error}
            </div>
          )}

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
              {isSubmitting ? 'Dodawanie...' : 'Dodaj kategorię'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
