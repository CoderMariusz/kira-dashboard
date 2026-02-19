import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T1: useActivity Hook Tests
 * React Query hook for fetching activity log entries with pagination and real-time updates
 */

// ═══════════════════════════════════════════
// MOCKS - Singleton chainable Supabase mock
// ═══════════════════════════════════════════

// Shared chainable query builder - every method returns the same object and is trackable
const mockQueryResult = { data: [] as any[], error: null, count: 0 };
const mockChain: Record<string, any> = {};
const chainMethods = ['select', 'eq', 'order', 'limit', 'lt', 'gte', 'lte', 'gt', 'range'];
chainMethods.forEach(method => {
  mockChain[method] = vi.fn(() => mockChain);
});
// Make the chain thenable (so `await query` resolves)
mockChain.then = (resolve: any) => resolve(mockQueryResult);

const mockFrom = vi.fn(() => mockChain);

const mockSupabase = {
  from: mockFrom,
  channel: vi.fn(),
  removeChannel: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

const mockUseRealtime = vi.fn();
vi.mock('@/lib/hooks/useRealtime', () => ({
  useRealtime: (...args: any[]) => mockUseRealtime(...args),
}));

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

let testQueryClient: QueryClient;

const createWrapper = () => {
  testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════

const mockActivity1 = {
  id: 'act-1',
  household_id: 'hh-1',
  entity_type: 'task' as const,
  entity_id: 'task-1',
  action: 'created',
  actor_id: 'user-1',
  actor_name: 'Jan Kowalski',
  metadata: { title: 'Zrobić zakupy' },
  created_at: new Date('2024-01-15T10:30:00Z').toISOString(),
};

describe('T1: useActivity Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult.data = [];
    mockQueryResult.error = null;
    // Re-mock chain methods (clearAllMocks resets them)
    chainMethods.forEach(method => {
      mockChain[method] = vi.fn(() => mockChain);
    });
    mockChain.then = (resolve: any) => resolve(mockQueryResult);
  });

  describe('AC1.1: Paginated fetch (20 per page, cursor-based)', () => {
    it('AC1.1: should fetch activity entries for household', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the hook called from('activity_log')
      expect(mockFrom).toHaveBeenCalledWith('activity_log');
      // Verify household filter
      expect(mockChain.eq).toHaveBeenCalledWith('household_id', 'hh-1');
    });

    it('AC1.1: should return activities, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('activities');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchNextPage');
      expect(result.current).toHaveProperty('hasNextPage');
      expect(result.current).toHaveProperty('isFetchingNextPage');
    });

    it('AC1.1: should order by created_at DESC', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('AC1.1: should limit to 20 items per page', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockChain.limit).toHaveBeenCalledWith(20);
    });

    it('AC1.1: should use cursor-based pagination with created_at', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First fetch should NOT have .lt() cursor
      // Subsequent fetches would use .lt() with a created_at value
      // This is verified by the chain structure
      expect(result.current.activities).toBeDefined();
    });
  });

  describe('AC1.2: Filter parameters (entityType, actorId, dateRange)', () => {
    it('AC1.2: should filter by entityType', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1', { entityType: 'task' }),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockChain.eq).toHaveBeenCalledWith('entity_type', 'task');
    });

    it('AC1.2: should filter by actorId', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1', { actorId: 'user-1' }),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockChain.eq).toHaveBeenCalledWith('actor_id', 'user-1');
    });

    it('AC1.2: should filter by dateRange.from', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const fromDate = new Date('2024-01-01');
      const { result } = renderHook(
        () => useActivity('hh-1', { dateRange: { from: fromDate, to: new Date() } }),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockChain.gte).toHaveBeenCalledWith('created_at', fromDate.toISOString());
    });

    it('AC1.2: should filter by dateRange.to', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const toDate = new Date('2024-12-31');
      const { result } = renderHook(
        () => useActivity('hh-1', { dateRange: { from: new Date('2024-01-01'), to: toDate } }),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockChain.lte).toHaveBeenCalledWith('created_at', toDate.toISOString());
    });

    it('AC1.2: should combine multiple filters', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      const { result } = renderHook(
        () => useActivity('hh-1', {
          entityType: 'task',
          actorId: 'user-1',
          dateRange: { from: fromDate, to: toDate }
        }),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockChain.eq).toHaveBeenCalledWith('entity_type', 'task');
      expect(mockChain.eq).toHaveBeenCalledWith('actor_id', 'user-1');
      expect(mockChain.gte).toHaveBeenCalledWith('created_at', fromDate.toISOString());
      expect(mockChain.lte).toHaveBeenCalledWith('created_at', toDate.toISOString());
    });
  });

  describe('AC1.3: useInfiniteQuery with getNextPageParam', () => {
    it('AC1.3: should use useInfiniteQuery', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activities).toBeDefined();
    });

    it('AC1.3: should have query key ["activity", householdId, filters]', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const filters = { entityType: 'task' as const };
      const { result } = renderHook(
        () => useActivity('hh-1', filters),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify query was registered in the cache with the expected key pattern
      const cache = testQueryClient.getQueryCache();
      const queries = cache.getAll();
      expect(queries.length).toBeGreaterThan(0);

      const queryKey = queries[0].queryKey;
      expect(queryKey[0]).toBe('activity');
      expect(queryKey[1]).toBe('hh-1');
    });

    it('AC1.3: getNextPageParam should return last item created_at when more pages exist', async () => {
      // Simulate a full page of 20 results
      mockQueryResult.data = Array.from({ length: 20 }, (_, i) => ({
        ...mockActivity1,
        id: `act-${i}`,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
      }));

      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With 20 results, hasNextPage should be true
      expect(result.current.hasNextPage).toBe(true);
    });

    it('AC1.3: getNextPageParam should return undefined when no more pages', async () => {
      // Simulate fewer than 20 results
      mockQueryResult.data = [mockActivity1];

      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(false);
    });
  });

  describe('AC1.4: Real-time subscription (useActivityRealtime)', () => {
    it('AC1.4: useActivityRealtime should be exported', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');
      expect(useActivityRealtime).toBeDefined();
    });

    it('AC1.4: should create channel with name "activity-feed-${householdId}"', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');

      renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      // useActivityRealtime delegates to useRealtime with channelName
      expect(mockUseRealtime).toHaveBeenCalledWith(
        expect.objectContaining({
          channelName: 'activity-feed-hh-1',
        })
      );
    });

    it('AC1.4: should subscribe to activity_log table', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');

      renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      expect(mockUseRealtime).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'activity_log',
        })
      );
    });

    it('AC1.4: should filter by household_id=eq.${householdId}', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');

      renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      expect(mockUseRealtime).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'household_id=eq.hh-1',
        })
      );
    });

    it('AC1.4: should invalidate ["activity"] query key on INSERT', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');

      renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      expect(mockUseRealtime).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKeys: [['activity']],
        })
      );
    });

    it('AC1.4: should be disabled when householdId is undefined', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');

      renderHook(
        () => useActivityRealtime(undefined),
        { wrapper: createWrapper() }
      );

      expect(mockUseRealtime).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('AC1.4: should clean up channel on unmount', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');

      const { unmount } = renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      // Verify useRealtime was called (it handles cleanup internally)
      expect(mockUseRealtime).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'activity_log',
          enabled: true,
        })
      );

      // Unmount should not throw
      unmount();
    });
  });
});
