'use client';

import { toast as sonnerToast } from 'sonner';

interface ToastInput {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = (input: ToastInput) => {
    if (input.variant === 'destructive') {
      sonnerToast.error(input.title, {
        description: input.description,
      });
    } else {
      sonnerToast.success(input.title, {
        description: input.description,
      });
    }
  };

  return { toast };
}
