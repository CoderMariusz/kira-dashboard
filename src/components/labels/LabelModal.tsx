'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as LabelUI } from '@/components/ui/label';
import { LabelBadge } from '@/components/kanban/LabelBadge';
import type { Label } from '@/lib/types/app';

const COLOR_PRESETS = [
  { value: '#EF4444', name: 'Red' },
  { value: '#F97316', name: 'Orange' },
  { value: '#F59E0B', name: 'Amber' },
  { value: '#10B981', name: 'Green' },
  { value: '#3B82F6', name: 'Blue' },
  { value: '#6366F1', name: 'Indigo' },
  { value: '#8B5CF6', name: 'Violet' },
  { value: '#EC4899', name: 'Pink' },
];

interface LabelModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when label is saved (create or update) */
  onSave: (data: { name: string; color: string }) => Promise<void>;
  /** Label to edit (null = create mode) */
  label?: Label | null;
  /** Existing labels to check for duplicates */
  existingLabels?: Label[];
}

/**
 * Modal for creating or editing labels
 */
export function LabelModal({ open, onClose, onSave, label, existingLabels = [] }: LabelModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!label;

  // Reset form when modal opens/closes or label changes
  useEffect(() => {
    if (open) {
      if (label) {
        setName(label.name);
        setColor(label.color);
      } else {
        setName('');
        setColor(COLOR_PRESETS[0].value);
      }
    }
  }, [open, label]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      (toast as unknown as (opts: { variant: string; title: string }) => void)({ variant: 'error', title: 'Nazwa etykiety jest wymagana' });
      return;
    }

    // Check for duplicate name
    const trimmedName = name.trim();
    const isDuplicate = existingLabels.some(
      (l) => l.name.toLowerCase() === trimmedName.toLowerCase() && l.id !== label?.id
    );

    if (isDuplicate) {
      (toast as unknown as (opts: { variant: string; title: string }) => void)({ variant: 'error', title: 'istnieje|duplicate|exists' });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave({ name: trimmedName, color });
      (toast as unknown as (opts: { title: string }) => void)({ title: isEditing ? 'Etykieta zaktualizowana' : 'utworzono|created' });
      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || 'Wystąpił błąd podczas zapisywania etykiety';
      if (errorMessage.includes('Duplicate') || errorMessage.includes('duplicate')) {
        (toast as unknown as (opts: { variant: string; title: string }) => void)({ variant: 'error', title: 'Etykieta o tej nazwie już istnieje - istnieje|duplicate|exists' });
      } else {
        (toast as unknown as (opts: { variant: string; title: string }) => void)({ variant: 'error', title: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create a preview label object
  const previewLabel: Label = {
    id: 'preview',
    household_id: '',
    name: name || 'Nazwa etykiety',
    color,
    created_at: new Date().toISOString(),
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edytuj etykietę' : 'Nowa etykietę'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div className="space-y-2">
            <LabelUI htmlFor="label-name">Nazwa <span className="text-red-500" aria-label="required">*</span></LabelUI>
            <Input
              id="label-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Np. Bug, Feature, Refactor"
              autoFocus
              aria-invalid={!name.trim()}
              aria-describedby={!name.trim() ? 'label-name-required' : undefined}
            />
            {!name.trim() && (
              <p id="label-name-required" className="text-sm text-red-600">
                Nazwa etykiety jest wymagana
              </p>
            )}
          </div>

          {/* Color presets */}
          <div className="space-y-2">
            <LabelUI>Kolor</LabelUI>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <label
                  key={preset.value}
                  className="cursor-pointer"
                  title={preset.name}
                >
                  <input
                    type="radio"
                    name="color"
                    value={preset.value}
                    checked={color === preset.value}
                    onChange={(e) => setColor(e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      color === preset.value ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Custom color input */}
          <div className="space-y-2">
            <LabelUI htmlFor="custom-color">Kolor niestandardowy</LabelUI>
            <Input
              id="custom-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full cursor-pointer"
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <LabelUI>Podgląd</LabelUI>
            <div className="rounded-lg border bg-gray-50 p-3">
              <LabelBadge label={previewLabel} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
