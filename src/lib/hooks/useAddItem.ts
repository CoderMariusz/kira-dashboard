'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { detectCategory } from '@/lib/utils/categoryDetection';
import { useCategories } from './useCategories';
import type { ShoppingItem } from '@/lib/types/database';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface AddItemData {
  name: string;
  quantity?: number;
  unit?: string | null;
  category_id?: string | null;
  category_name?: string;
}

// ═══════════════════════════════════════════════════════════
// MUTATION FUNCTION
// ═══════════════════════════════════════════════════════════

async function addItem(listId: string, itemData: AddItemData): Promise<ShoppingItem> {
  const response = await fetch('/api/shopping/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      list_id: listId,
      ...itemData,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create item');
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════
// HOOK: useAddItem
// ═══════════════════════════════════════════════════════════

/**
 * Mutation hook for adding shopping items with optimistic updates.
 * 
 * Automatically detects category if not provided and implements
 * optimistic UI with rollback on error.
 * 
 * @param listId - The shopping list ID
 * @returns Mutation object with mutate, isPending, error properties
 * 
 * @example
 * ```ts
 * const addItem = useAddItem('list-123');
 * addItem.mutate({ name: 'Milk', quantity: 1, unit: 'l' });
 * ```
 */
export function useAddItem(listId: string) {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();

  return useMutation({
    mutationFn: (itemData: AddItemData) => {
      // Auto-detect category if not provided
      let finalData = { ...itemData };
      
      if (!finalData.category_id && categories) {
        const detectedCategoryId = detectCategory(itemData.name, categories);
        if (detectedCategoryId) {
          const category = categories.find(cat => cat.id === detectedCategoryId);
          finalData.category_id = detectedCategoryId;
          finalData.category_name = category?.name ?? 'Inne';
        }
      }

      return addItem(listId, finalData);
    },

    // Optimistic update
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['shopping', listId] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<ShoppingItem[]>(['shopping', listId]);

      // Optimistically add temp item
      queryClient.setQueryData<ShoppingItem[]>(['shopping', listId], (old = []) => {
        const tempItem: ShoppingItem = {
          id: `temp-${Date.now()}`,
          list_id: listId,
          name: newItem.name,
          quantity: newItem.quantity ?? 1,
          unit: newItem.unit ?? null,
          category_id: newItem.category_id ?? null,
          category_name: newItem.category_name ?? 'Inne',
          store: null,
          is_bought: false,
          added_by: null,
          bought_by: null,
          estimated_price: null,
          source: 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [...old, tempItem];
      });

      return { previousItems };
    },

    // Rollback on error
    onError: (_error, _newItem, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['shopping', listId], context.previousItems);
      }
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', listId] });
    },
  });
}
