'use client';

import { useState, useCallback } from 'react';
import { useAddCategory } from '@/lib/hooks/useAddCategory';
import { useFormReset } from '@/lib/hooks/useFormReset';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
 * Uses Radix UI Dialog with:
 * - Close button (X) in top-right
 * - ESC key support for closing
 * - Form validation with required field indicators
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
  const [nameError, setNameError] = useState<string | null>(null);

  const { mutate, isPending, isSuccess, isError, data } = useAddCategory();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form state
  const resetForm = useCallback(() => {
    setName('');
    setIcon('📦');
    setColor('#6B7280');
    setErrorMsg(null);
    setNameError(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name field
    if (!name.trim()) {
      setNameError('Nazwa kategorii jest wymagana');
      return;
    }
    
    if (name.trim().length < 2) {
      setNameError('Nazwa musi mieć co najmniej 2 znaki');
      return;
    }

    mutate({
      name: name.trim(),
      icon,
      color,
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    // Clear error when user starts typing
    if (nameError) {
      setNameError(null);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-category-title"
        showCloseButton={true}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle id="add-category-title">Dodaj kategorię</DialogTitle>
          <DialogDescription>
            Utwórz nową kategorię dla swoich produktów
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="category-name">
              Nazwa kategorii <span className="text-red-500" aria-label="required">*</span>
            </Label>
            <Input
              id="category-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="np. Przekąski"
              maxLength={100}
              disabled={isPending}
              autoFocus
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
              className={nameError ? 'border-red-500 bg-red-50' : ''}
            />
            {nameError && (
              <p id="name-error" className="text-sm text-red-600">
                {nameError}
              </p>
            )}
          </div>

          {/* Icon field */}
          <div className="space-y-2">
            <Label htmlFor="category-icon">
              Ikona (max 2 znaki)
            </Label>
            <Input
              id="category-icon"
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, 2))}
              maxLength={2}
              disabled={isPending}
              placeholder="📦"
            />
          </div>

          {/* Color field */}
          <div className="space-y-2">
            <Label htmlFor="category-color">
              Kolor
            </Label>
            <div className="flex gap-2">
              <Input
                id="category-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isPending}
                className="h-10 w-16 rounded border p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isPending}
                placeholder="#6B7280"
              />
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isPending}
            >
              {isPending ? 'Tworzenie...' : 'Zapisz'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
