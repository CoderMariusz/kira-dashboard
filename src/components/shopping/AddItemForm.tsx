'use client';

import { useState, useCallback } from 'react';
import { useAddItem } from '@/lib/hooks/useAddItem';
import { useCategories } from '@/lib/hooks/useCategories';
import { useFormReset } from '@/lib/hooks/useFormReset';
import { AddCategoryModal } from './AddCategoryModal';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface AddItemFormProps {
  listId: string;
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

/**
 * Form for adding new shopping items to a list.
 * 
 * Features:
 * - Auto-category detection
 * - Custom category creation
 * - Unit selection
 * - Form validation
 * 
 * @component
 * @example
 * ```tsx
 * <AddItemForm listId="list-123" />
 * ```
 */
export function AddItemForm({ listId }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useCategories();
  const { mutate, isPending, isSuccess, isError } = useAddItem(listId);

  // Reset form state
  const resetForm = useCallback(() => {
    setName('');
    setQuantity(1);
    setUnit(null);
    setCategoryId(null);
    setError(null);
  }, []);

  // Auto-reset on success
  useFormReset(isSuccess, resetForm);

  // Show error on failure
  useFormReset(isError, () => {
    setError('Nie udało się dodać produktu. Spróbuj ponownie.');
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const selectedCategory = categories?.find(cat => cat.id === categoryId);

    mutate({
      name: name.trim(),
      quantity,
      unit,
      category_id: categoryId,
      category_name: selectedCategory?.name,
    });
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'add-new') {
      setShowCategoryModal(true);
    } else if (value === 'auto') {
      setCategoryId(null);
    } else {
      setCategoryId(value);
    }
  };

  const handleNewCategoryCreated = (newCategoryId: string) => {
    setCategoryId(newCategoryId);
    setShowCategoryModal(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name field */}
          <div className="md:col-span-2">
            <label htmlFor="item-name" className="block text-sm font-medium mb-1">
              Nazwa produktu
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Mleko 2%"
              maxLength={200}
              disabled={isPending}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Quantity field */}
          <div>
            <label htmlFor="item-quantity" className="block text-sm font-medium mb-1">
              Ilość
            </label>
            <input
              id="item-quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              disabled={isPending}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Unit field */}
          <div>
            <label htmlFor="item-unit" className="block text-sm font-medium mb-1">
              Jednostka
            </label>
            <select
              id="item-unit"
              value={unit ?? ''}
              onChange={(e) => setUnit(e.target.value || null)}
              disabled={isPending}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">-</option>
              <option value="szt">szt</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="opak">opak</option>
            </select>
          </div>

          {/* Category field */}
          <div className="md:col-span-2">
            <label htmlFor="item-category" className="block text-sm font-medium mb-1">
              Kategoria
            </label>
            <select
              id="item-category"
              value={categoryId ?? 'auto'}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="auto">Kategoria (auto)</option>
              {categories?.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
              <option value="add-new">➕ Dodaj kategorię</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {/* Submit button */}
        <div className="mt-4">
          <button
            type="submit"
            disabled={!name.trim() || isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Dodawanie...' : 'Dodaj produkt'}
          </button>
        </div>
      </form>

      {/* Category modal */}
      <AddCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSuccess={handleNewCategoryCreated}
      />
    </>
  );
}
