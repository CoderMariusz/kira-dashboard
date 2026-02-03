'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  /** Czy dialog jest otwarty */
  open: boolean;
  /** Callback zamknięcia */
  onClose: () => void;
  /** Callback potwierdzenia */
  onConfirm: () => void;
  /** Tytuł dialogu */
  title: string;
  /** Opis / szczegóły */
  description: string;
  /** Tekst na przycisku potwierdzenia */
  confirmLabel?: string;
  /** Wariant przycisku potwierdzenia */
  confirmVariant?: 'default' | 'destructive';
  /** Czy operacja jest w trakcie */
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Potwierdź',
  confirmVariant = 'destructive',
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Anuluj
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Usuwanie...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
