'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ShoppingCategory } from '@/lib/types/database';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface AddCategoryData {
  name: string;
  icon?: string;
  color?: string;
}

// ═══════════════════════════════════════════════════════════
// MUTATION FUNCTION
// ═══════════════════════════════════════════════════════════

async function addCategory(categoryData: AddCategoryData): Promise<ShoppingCategory> {
  const response = await fetch('/api/shopping/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    throw new Error('Failed to create category');
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════
// HOOK: useAddCategory
// ═══════════════════════════════════════════════════════════

/**
 * Mutation hook for adding custom shopping categories.
 * 
 * Invalidates categories query on success to refetch updated list.
 * 
 * @returns Mutation object with mutate, isPending, error properties
 * 
 * @example
 * ```ts
 * const addCategory = useAddCategory();
 * addCategory.mutate({ name: 'Przekąski', icon: '🍿', color: '#FFD700' });
 * ```
 */
export function useAddCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
