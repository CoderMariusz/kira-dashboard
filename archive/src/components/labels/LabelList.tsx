'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/kanban/ConfirmDialog';
import type { Label } from '@/lib/types/app';

interface LabelListProps {
  labels: Label[];
  householdId: string;
  /** Callback when edit is clicked */
  onEdit?: (label: Label) => void;
  /** Callback when delete is confirmed */
  onDelete?: (labelId: string) => void;
}

/**
 * Display a list of labels with edit and delete actions
 */
export function LabelList({ labels: initialLabels, householdId, onEdit, onDelete }: LabelListProps) {
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null);

  // Update internal state when props change
  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  const handleDeleteClick = (label: Label) => {
    setLabelToDelete(label);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (labelToDelete) {
      // Call external handler if provided
      if (onDelete) {
        onDelete(labelToDelete.id);
      }
      // Update internal state for test compatibility
      setLabels((prev) => prev.filter((l) => l.id !== labelToDelete.id));
      setDeleteConfirmOpen(false);
      setLabelToDelete(null);
    }
  };

  const handleEdit = (label: Label) => {
    if (onEdit) {
      onEdit(label);
    }
  };

  if (labels.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">Brak etykiet</p>
        <p className="mt-1 text-xs text-gray-400">Dodaj pierwszą etykietę, aby zacząć organizować zadania</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {labels.map((label) => (
          <div
            key={label.id}
            className="flex items-center justify-between rounded-lg border bg-white p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: label.color }}
                data-testid="label-color-dot"
              />
              <span className="font-medium">{label.name}</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(label)}
                aria-label={`Edytuj ${label.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(label)}
                aria-label={`Usuń ${label.name}`}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Czy na pewno chcesz usunąć tę etykietę?"
        description={`Etykieta "${labelToDelete?.name}" zostanie usunięta ze wszystkich zadań.`}
        onConfirm={handleConfirmDelete}
        confirmLabel="Usuń"
      />
    </>
  );
}
