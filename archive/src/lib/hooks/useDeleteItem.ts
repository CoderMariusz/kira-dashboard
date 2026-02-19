'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/lib/constants/shopping';

// ═══════════════════════════════════════════════════════════
// MUTATION FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Deletes a shopping item via DELETE API.
 * 
 * @param id - Item ID to delete
 * @returns Success confirmation from server
 * @throws Error if API request fails
 */
async function deleteItem(id: string): Promise<{ success: boolean }> {
  const response = await fetch(API_ENDPOINTS.shoppingItem(id), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete item');
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════
// HOOK: useDeleteItem
// ═══════════════════════════════════════════════════════════

/**
 * Mutation hook for deleting a shopping item.
 * 
 * @param listId - The shopping list ID
 * @returns Mutation object with deleteItem function and isPending state
 * 
 * @example
 * ```ts
 * const { deleteItem, isPending } = useDeleteItem('list-123');
 * deleteItem('item-456');
 * ```
 */
export function useDeleteItem(listId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping', listId] });
    },
    onError: (error) => {
      console.error('Failed to delete item:', error);
    },
  });

  return {
    deleteItem: (id: string) => mutation.mutate(id),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
