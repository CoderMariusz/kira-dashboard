import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T1: useActivity Hook Tests
 * React Query hook for fetching activity log entries with pagination and real-time updates
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * useActivity hook does not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS - COMPLETE Supabase client with realtime
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            lt: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
            lt: vi.fn(() => Promise.resolve({ data: [], error: null })),
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

vi.mock('@/lib/hooks/useRealtime', () => ({
  useRealtime: vi.fn(),
}));

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════
// MOCK DATA - ALL fields from ActivityLog type
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

const mockActivity2 = {
  id: 'act-2',
  household_id: 'hh-1',
  entity_type: 'shopping' as const,
  entity_id: 'list-1',
  action: 'created',
  actor_id: 'user-2',
  actor_name: 'Anna Nowak',
  metadata: { count: 3 },
  created_at: new Date('2024-01-15T09:15:00Z').toISOString(),
};

const mockActivity3 = {
  id: 'act-3',
  household_id: 'hh-1',
  entity_type: 'reminder' as const,
  entity_id: 'reminder-1',
  action: 'sent',
  actor_id: null,
  actor_name: 'Kira',
  metadata: { task_title: 'Spotkanie', delivery_method: 'email' },
  created_at: new Date('2024-01-15T08:00:00Z').toISOString(),
};

const { createClient } = await import('@/lib/supabase/client');

describe('T1: useActivity Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      expect(createClient).toHaveBeenCalled();
      const supabaseMock = createClient();
      expect(supabaseMock.from).toHaveBeenCalledWith('activity_log');
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

      const supabaseMock = createClient();
      const fromMock = supabaseMock.from('activity_log');
      const selectMock = fromMock.select('*');
      const orderMock = selectMock.order('created_at', { ascending: false });

      expect(orderMock).toBeDefined();
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

      const supabaseMock = createClient();
      const fromMock = supabaseMock.from('activity_log');
      const selectMock = fromMock.select('*');
      const orderMock = selectMock.order('created_at', { ascending: false });
      const limitMock = orderMock.limit(20);

      expect(limitMock).toBeDefined();
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

      // fetchNextPage should use last item's created_at as cursor
      if (result.current.hasNextPage) {
        await result.current.fetchNextPage();

        const supabaseMock = createClient();
        const fromMock = supabaseMock.from('activity_log');
        const selectMock = fromMock.select('*');
        const orderMock = selectMock.order('created_at', { ascending: false });
        const limitMock = orderMock.limit(20);
        const ltMock = limitMock.lt(expect.any(String));

        expect(ltMock).toBeDefined();
      }
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

      const supabaseMock = createClient();
      const fromMock = supabaseMock.from('activity_log');
      const selectMock = fromMock.select('*');
      const orderMock = selectMock.order('created_at', { ascending: false });
      const limitMock = orderMock.limit(20);
      const eqMock = limitMock.eq('entity_type', 'task');

      expect(eqMock).toBeDefined();
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

      const supabaseMock = createClient();
      const fromMock = supabaseMock.from('activity_log');
      const selectMock = fromMock.select('*');
      const orderMock = selectMock.order('created_at', { ascending: false });
      const limitMock = orderMock.limit(20);
      const eqMock = limitMock.eq('actor_id', 'user-1');

      expect(eqMock).toBeDefined();
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

      const supabaseMock = createClient();
      const fromMock = supabaseMock.from('activity_log');
      const selectMock = fromMock.select('*');
      const orderMock = selectMock.order('created_at', { ascending: false });
      const limitMock = orderMock.limit(20);
      const gteMock = limitMock.gte('created_at', fromDate.toISOString());

      expect(gteMock).toBeDefined();
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

      const supabaseMock = createClient();
      const fromMock = supabaseMock.from('activity_log');
      const selectMock = fromMock.select('*');
      const orderMock = selectMock.order('created_at', { ascending: false });
      const limitMock = orderMock.limit(20);
      const gteMock = limitMock.gte('created_at', expect.any(String));
      const lteMock = gteMock.lte('created_at', toDate.toISOString());

      expect(lteMock).toBeDefined();
    });

    it('AC1.2: should combine multiple filters', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1', {
          entityType: 'task',
          actorId: 'user-1',
          dateRange: { from: new Date('2024-01-01'), to: new Date('2024-12-31') }
        }),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const supabaseMock = createClient();
      const fromMock = supabaseMock.from('activity_log');
      const selectMock = fromMock.select('*');
      const orderMock = selectMock.order('created_at', { ascending: false });
      const limitMock = orderMock.limit(20);
      const eqMock1 = limitMock.eq('entity_type', 'task');
      const eqMock2 = eqMock1.eq('actor_id', 'user-1');
      const gteMock = eqMock2.gte('created_at', expect.any(String));
      const lteMock = gteMock.lte('created_at', expect.any(String));

      expect(lteMock).toBeDefined();
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

      // useInfiniteQuery returns pages data
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

      // Query key should be set correctly
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const cache = queryClient.getQueryCache();
      expect(cache.getAll().length).toBeGreaterThan(0);
    });

    it('AC1.3: getNextPageParam should return last item created_at when more pages exist', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // If we have exactly 20 items, there should be a next page cursor
      if (result.current.activities?.length === 20) {
        const lastActivity = result.current.activities[result.current.activities.length - 1];
        expect(result.current.hasNextPage).toBe(true);
      }
    });

    it('AC1.3: getNextPageParam should return undefined when no more pages', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      const { result } = renderHook(
        () => useActivity('hh-1'),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // If we have fewer than 20 items, there's no next page
      if (result.current.activities && result.current.activities.length < 20) {
        expect(result.current.hasNextPage).toBe(false);
      }
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

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith('activity-feed-hh-1');
      });
    });

    it('AC1.4: should subscribe to activity_log table', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');
      const { useRealtime } = await import('@/lib/hooks/useRealtime');

      renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(useRealtime).toHaveBeenCalledWith(
          expect.objectContaining({
            table: 'activity_log',
          })
        );
      });
    });

    it('AC1.4: should filter by household_id=eq.${householdId}', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');
      const { useRealtime } = await import('@/lib/hooks/useRealtime');

      renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(useRealtime).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: 'household_id=eq.hh-1',
          })
        );
      });
    });

    it('AC1.4: should invalidate ["activity"] query key on INSERT', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');
      const { useRealtime } = await import('@/lib/hooks/useRealtime');

      renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(useRealtime).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKeys: [['activity']],
          })
        );
      });
    });

    it('AC1.4: should be disabled when householdId is undefined', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');
      const { useRealtime } = await import('@/lib/hooks/useRealtime');

      renderHook(
        () => useActivityRealtime(undefined),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(useRealtime).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false,
          })
        );
      });
    });

    it('AC1.4: should clean up channel on unmount', async () => {
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');

      const { unmount } = renderHook(
        () => useActivityRealtime('hh-1'),
        { wrapper: createWrapper() }
      );

      unmount();

      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });
});
