'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_ENDPOINTS, TOAST_MESSAGES } from '@/lib/constants/shopping';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ShoppingItemResponse {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category_name: string;
  is_bought: boolean;
  bought_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ToggleVariables {
  id: string;
  currentBought: boolean;
  itemName: string;
}

// ═══════════════════════════════════════════════════════════
// MUTATION FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Toggles shopping item's bought status via PATCH API.
 * 
 * @param id - Item ID to toggle
 * @param currentBought - Current bought status (will be inverted)
 * @returns Updated item from server
 * @throws Error if API request fails
 */
async function toggleItem(id: string, currentBought: boolean): Promise<ShoppingItemResponse> {
  const response = await fetch(API_ENDPOINTS.shoppingItem(id), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      is_bought: !currentBought,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to toggle item');
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════
// HOOK: useToggleItem
// ═══════════════════════════════════════════════════════════

/**
 * Mutation hook for toggling shopping item bought status.
 * Shows toast on success/error (not prematurely before API call).
 * 
 * @param listId - The shopping list ID
 * @returns Mutation object with toggle function and isPending state
 */
export function useToggleItem(listId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, currentBought }: ToggleVariables) =>
      toggleItem(id, currentBought),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shopping', listId] });
      // Toast on confirmed success (not premature)
      if (!variables.currentBought) {
        toast.success(TOAST_MESSAGES.itemMarkedBought(variables.itemName));
      } else {
        toast.info(TOAST_MESSAGES.itemMarkedNotBought(variables.itemName));
      }
    },
    onError: () => {
      toast.error(TOAST_MESSAGES.errorToggling);
    },
  });

  return {
    toggle: (id: string, currentBought: boolean, itemName = '') =>
      mutation.mutate({ id, currentBought, itemName }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
