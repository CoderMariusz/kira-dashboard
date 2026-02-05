'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreateLabelButtonProps {
  /** Callback when button is clicked */
  onOpen: () => void;
}

/**
 * Button to open the create label modal
 */
export function CreateLabelButton({ onOpen }: CreateLabelButtonProps) {
  return (
    <Button onClick={onOpen}>
      <Plus className="mr-2 h-4 w-4" />
      Dodaj etykietę
    </Button>
  );
}
