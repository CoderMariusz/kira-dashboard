'use client';

import { useState, useCallback } from 'react';
import { useAddCategory } from '@/lib/hooks/useAddCategory';
import { useFormReset } from '@/lib/hooks/useFormReset';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (categoryId: string) => void;
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

/**
 * Modal for creating custom shopping categories.
 * 
 * @component
 * @example
 * ```tsx
 * <AddCategoryModal 
 *   isOpen={showModal} 
 *   onClose={() => setShowModal(false)}
 *   onSuccess={(id) => console.log('Created:', id)}
 * />
 * ```
 */
export function AddCategoryModal({ isOpen, onClose, onSuccess }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#6B7280');

  const { mutate, isPending, isSuccess, isError, data } = useAddCategory();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form state
  const resetForm = useCallback(() => {
    setName('');
    setIcon('📦');
    setColor('#6B7280');
    setErrorMsg(null);
  }, []);

  // Auto-reset on success
  useFormReset(isSuccess, () => {
    if (data) {
      onSuccess?.(data.id);
      onClose();
      resetForm();
    }
  }, [data, onClose, onSuccess, resetForm]);

  // Show error on failure
  useFormReset(isError, () => {
    setErrorMsg('Nie udało się utworzyć kategorii. Spróbuj ponownie.');
  });

  // Don't render if not open
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    mutate({
      name: name.trim(),
      icon,
      color,
    });
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-category-title"
      onKeyDown={(e) => { if (e.key === 'Escape') handleCancel(); }}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 id="add-category-title" className="text-xl font-semibold mb-4">Dodaj kategorię</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Name field */}
          <div className="mb-4">
            <label htmlFor="category-name" className="block text-sm font-medium mb-1">
              Nazwa kategorii
            </label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Przekąski"
              maxLength={100}
              disabled={isPending}
              autoFocus
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Icon field */}
          <div className="mb-4">
            <label htmlFor="category-icon" className="block text-sm font-medium mb-1">
              Ikona (max 2 znaki)
            </label>
            <input
              id="category-icon"
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, 2))}
              maxLength={2}
              disabled={isPending}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Color field */}
          <div className="mb-4">
            <label htmlFor="category-color" className="block text-sm font-medium mb-1">
              Kolor
            </label>
            <div className="flex gap-2">
              <input
                id="category-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isPending}
                className="h-10 w-16 rounded border"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isPending}
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="#6B7280"
              />
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Tworzenie...' : 'Zapisz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
