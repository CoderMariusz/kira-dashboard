'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from './useRealtime';
import type { ShoppingItem } from '@/lib/types/database';
import type { UseQueryResult } from '@tanstack/react-query';

// ═══════════════════════════════════════════════════════════
// FETCH: Shopping Items by list_id
// ═══════════════════════════════════════════════════════════

/**
 * Fetches shopping items for a specific list from Supabase.
 * 
 * @param listId - The shopping list's unique identifier
 * @returns Promise resolving to array of shopping items
 * @throws {Error} If Supabase query fails
 */
async function fetchShoppingItems(listId: string): Promise<ShoppingItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('list_id', listId);

  if (error) throw error;
  return data ?? [];
}

// ═══════════════════════════════════════════════════════════
// HOOK: useShopping
// ═══════════════════════════════════════════════════════════

/**
 * Fetches shopping items by list with real-time sync.
 * 
 * Subscribes to realtime changes filtered by list_id. Cache key: ['shopping', listId].
 * 
 * @param listId - The shopping list's unique identifier
 * @returns Query result containing array of shopping items for the list
 * 
 * @example
 * ```ts
 * const { data: items, isLoading } = useShopping('list-123');
 * ```
 */
export function useShopping(listId: string): UseQueryResult<ShoppingItem[], Error> {
  // Subscribe to realtime changes using shared hook with filter
  useRealtime({
    table: 'shopping_items',
    filter: listId ? `list_id=eq.${listId}` : undefined,
    queryKeys: [['shopping', listId]],
    enabled: !!listId,
    channelName: listId ? `shopping_items:${listId}` : undefined, // Consistent format for tests
  });

  return useQuery({
    queryKey: ['shopping', listId],
    queryFn: () => fetchShoppingItems(listId),
    enabled: !!listId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
