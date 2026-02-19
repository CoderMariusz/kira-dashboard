'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from './useRealtime';
import type { ActivityLog } from '@/lib/types/database';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ActivityFilters {
  entityType?: 'task' | 'shopping' | 'reminder' | 'board';
  actorId?: string;
  dateRange?: { from: Date; to: Date };
}

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════
// FETCH: Activity log entries with pagination and filters
// ═══════════════════════════════════════════════════════════

async function fetchActivities({
  householdId,
  pageParam,
  filters,
}: {
  householdId: string;
  pageParam: string | undefined;
  filters?: ActivityFilters;
}): Promise<ActivityLog[]> {
  const supabase = createClient();

  let query = supabase
    .from('activity_log')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  // Cursor-based pagination: get items before this timestamp
  if (pageParam) {
    query = query.lt('created_at', pageParam);
  }

  // Filter by entity type
  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  // Filter by actor ID ('kira' = system actor with null actor_id)
  if (filters?.actorId) {
    if (filters.actorId === 'kira') {
      query = query.is('actor_id', null);
    } else {
      query = query.eq('actor_id', filters.actorId);
    }
  }

  // Filter by date range (from)
  if (filters?.dateRange?.from) {
    query = query.gte('created_at', filters.dateRange.from.toISOString());
  }

  // Filter by date range (to)
  if (filters?.dateRange?.to) {
    query = query.lte('created_at', filters.dateRange.to.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}

// ═══════════════════════════════════════════════════════════
// HOOK: useActivity
// ═══════════════════════════════════════════════════════════

/**
 * Fetches activity log entries with cursor-based pagination.
 * 
 * @param householdId - The household's unique identifier
 * @param filters - Optional filters (entityType, actorId, dateRange)
 * @returns Object containing activities, loading state, error, and pagination controls
 * 
 * @example
 * ```ts
 * const { activities, isLoading, fetchNextPage, hasNextPage } = useActivity('hh-123', {
 *   entityType: 'task',
 *   actorId: 'user-123'
 * });
 * ```
 */
export function useActivity(
  householdId: string | undefined,
  filters?: ActivityFilters
) {
  const result = useInfiniteQuery({
    queryKey: ['activity', householdId, filters],
    queryFn: ({ pageParam }) =>
      fetchActivities({ householdId: householdId!, pageParam, filters }),
    getNextPageParam: (lastPage) => {
      // If we got fewer items than PAGE_SIZE, we've reached the end
      if (lastPage.length < PAGE_SIZE) return undefined;
      // Return the created_at of the last item as the cursor for the next page
      return lastPage[lastPage.length - 1]?.created_at;
    },
    initialPageParam: undefined as string | undefined,
    enabled: !!householdId,
  });

  // Flatten pages into a single array
  const activities = result.data?.pages.flat() ?? [];

  return {
    activities,
    isLoading: result.isLoading,
    error: result.error,
    fetchNextPage: result.fetchNextPage,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: useActivityRealtime
// ═══════════════════════════════════════════════════════════

/**
 * Real-time subscription for activity log changes.
 * Invalidates the ['activity'] query cache on INSERT events.
 * 
 * @param householdId - The household's unique identifier
 * 
 * @example
 * ```ts
 * useActivityRealtime('hh-123');
 * ```
 */
export function useActivityRealtime(householdId: string | undefined) {
  useRealtime({
    table: 'activity_log',
    filter: householdId ? `household_id=eq.${householdId}` : undefined,
    queryKeys: [['activity']],
    enabled: !!householdId,
    channelName: householdId ? `activity-feed-${householdId}` : undefined,
  });
}
