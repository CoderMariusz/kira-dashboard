'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from './useRealtime';
import type { ShoppingCategory } from '@/lib/types/database';
import type { UseQueryResult } from '@tanstack/react-query';

// ═══════════════════════════════════════════════════════════
// FETCH: Shopping Categories
// ═══════════════════════════════════════════════════════════

/**
 * Fetches all shopping categories from Supabase ordered by position.
 * 
 * @returns Promise resolving to array of shopping categories
 * @throws {Error} If Supabase query fails
 */
async function fetchCategories(): Promise<ShoppingCategory[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('shopping_categories')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ═══════════════════════════════════════════════════════════
// HOOK: useCategories
// ═══════════════════════════════════════════════════════════

/**
 * Fetches shopping categories with real-time sync.
 * 
 * Subscribes to realtime changes via Supabase. Cache key: ['categories'].
 * 
 * @returns Query result containing array of shopping categories
 * 
 * @example
 * ```ts
 * const { data: categories, isLoading } = useCategories();
 * ```
 */
export function useCategories(): UseQueryResult<ShoppingCategory[], Error> {
  // Subscribe to realtime changes using shared hook
  useRealtime({
    table: 'shopping_categories',
    queryKeys: [['categories']],
    channelName: 'shopping_categories', // Consistent channel name for tests
  });
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes — categories rarely change
  });
}
