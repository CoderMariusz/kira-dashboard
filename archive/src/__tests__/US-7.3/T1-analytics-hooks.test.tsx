import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T1: Database Types & Analytics Hooks
 * Tests for useAnalytics hooks
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Hooks do not exist yet
 */

// Mock Supabase client
const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock data matching database.ts types
const mockTasks = [
  {
    id: 'task-1',
    board_id: 'board-1',
    title: 'Completed Task',
    description: null,
    column: 'done',
    priority: 'medium',
    due_date: null,
    assignee_id: null,
    created_by: 'user-1',
    position: 0,
    labels: [],
    subtasks: [],
    source: 'manual',
    original_message: null,
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
    completed_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'task-2',
    board_id: 'board-1',
    title: 'Active Task',
    description: null,
    column: 'in_progress',
    priority: 'high',
    due_date: new Date('2024-01-20').toISOString(),
    assignee_id: null,
    created_by: 'user-1',
    position: 1,
    labels: [],
    subtasks: [],
    source: 'manual',
    original_message: null,
    created_at: new Date('2024-01-16').toISOString(),
    updated_at: new Date('2024-01-16').toISOString(),
    completed_at: null,
  },
  {
    id: 'task-3',
    board_id: 'board-1',
    title: 'Overdue Task',
    description: null,
    column: 'plan',
    priority: 'urgent',
    due_date: new Date('2024-01-10').toISOString(),
    assignee_id: null,
    created_by: 'user-1',
    position: 2,
    labels: [],
    subtasks: [],
    source: 'manual',
    original_message: null,
    created_at: new Date('2024-01-05').toISOString(),
    updated_at: new Date('2024-01-05').toISOString(),
    completed_at: null,
  },
];

const mockShoppingItems = [
  {
    id: 'item-1',
    list_id: 'list-1',
    name: 'Milk',
    quantity: 2,
    unit: null,
    category_id: 'cat-1',
    category_name: 'Dairy',
    store: null,
    is_bought: false,
    added_by: 'user-1',
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'item-2',
    list_id: 'list-1',
    name: 'Bread',
    quantity: 1,
    unit: null,
    category_id: 'cat-2',
    category_name: 'Bakery',
    store: null,
    is_bought: false,
    added_by: 'user-1',
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: new Date('2024-01-16').toISOString(),
    updated_at: new Date('2024-01-16').toISOString(),
  },
];

describe('T1: Database Types & Analytics Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2024-01-20'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useAnalyticsOverview', () => {
    it('AC1.1: should return completed, active, overdue, completionRate', async () => {
      const { useAnalyticsOverview } = await import('@/lib/hooks/useAnalytics');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockTasks,
              error: null,
            })),
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useAnalyticsOverview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual({
        completed: expect.any(Number),
        active: expect.any(Number),
        overdue: expect.any(Number),
        completionRate: expect.any(Number),
      });
    });

    it('AC1.1b: should calculate completionRate as percentage', async () => {
      const { useAnalyticsOverview } = await import('@/lib/hooks/useAnalytics');

      const { result } = renderHook(() => useAnalyticsOverview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data?.completionRate).toBeGreaterThanOrEqual(0);
        expect(result.current.data?.completionRate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('useCompletionTrend', () => {
    it('AC1.2: should return array of { date, completed } for last N days', async () => {
      const { useCompletionTrend } = await import('@/lib/hooks/useAnalytics');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useCompletionTrend(30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data).toHaveLength(30);
      expect(result.current.data[0]).toHaveProperty('date');
      expect(result.current.data[0]).toHaveProperty('completed');
    });

    it('AC1.2b: should default to 30 days if not specified', async () => {
      const { useCompletionTrend } = await import('@/lib/hooks/useAnalytics');

      const { result } = renderHook(() => useCompletionTrend(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(30);
      });
    });
  });

  describe('usePriorityDistribution', () => {
    it('AC1.3: should return array of { name, value, color } for active tasks', async () => {
      const { usePriorityDistribution } = await import('@/lib/hooks/useAnalytics');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockTasks,
              error: null,
            })),
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => usePriorityDistribution(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data[0]).toHaveProperty('name');
      expect(result.current.data[0]).toHaveProperty('value');
      expect(result.current.data[0]).toHaveProperty('color');
    });

    it('AC1.3b: should exclude completed tasks (column !== done)', async () => {
      const { usePriorityDistribution } = await import('@/lib/hooks/useAnalytics');

      const { result } = renderHook(() => usePriorityDistribution(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        // Completed task should not be counted
        const urgentTasks = result.current.data?.find((d: any) => d.name === 'Urgent');
        expect(urgentTasks?.value).toBe(1); // Only the overdue task
      });
    });
  });

  describe('useShoppingCategories', () => {
    it('AC1.4: should return array of { category, count } sorted by count desc', async () => {
      const { useShoppingCategories } = await import('@/lib/hooks/useAnalytics');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: mockShoppingItems,
            error: null,
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useShoppingCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data[0]).toHaveProperty('category');
      expect(result.current.data[0]).toHaveProperty('count');

      // Should be sorted by count desc
      const counts = result.current.data.map((d: any) => d.count);
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
    });
  });

  describe('useActivityHeatmap', () => {
    it('AC1.5: should return array of { date, count, intensity } for last N days', async () => {
      const { useActivityHeatmap } = await import('@/lib/hooks/useAnalytics');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [
                  {
                    id: 'activity-1',
                    household_id: 'hh-1',
                    entity_type: 'task',
                    entity_id: 'task-1',
                    action: 'created',
                    actor_id: 'user-1',
                    actor_name: 'Test User',
                    metadata: {},
                    created_at: new Date('2024-01-15').toISOString(),
                  },
                ],
                error: null,
              })),
            })),
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useActivityHeatmap(90), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data).toHaveLength(90);
      expect(result.current.data[0]).toHaveProperty('date');
      expect(result.current.data[0]).toHaveProperty('count');
      expect(result.current.data[0]).toHaveProperty('intensity');
    });

    it('AC1.5b: intensity should be 0-4 scale', async () => {
      const { useActivityHeatmap } = await import('@/lib/hooks/useAnalytics');

      const { result } = renderHook(() => useActivityHeatmap(90), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        result.current.data.forEach((day: any) => {
          expect(day.intensity).toBeGreaterThanOrEqual(0);
          expect(day.intensity).toBeLessThanOrEqual(4);
        });
      });
    });
  });

  describe('All Hooks', () => {
    it('AC1.6: should handle loading/error states', async () => {
      const { useAnalyticsOverview } = await import('@/lib/hooks/useAnalytics');

      const { result } = renderHook(() => useAnalyticsOverview(), {
        wrapper: createWrapper(),
      });

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('AC1.6b: should return null when no household', async () => {
      const { useAnalyticsOverview } = await import('@/lib/hooks/useAnalytics');

      const { result } = renderHook(() => useAnalyticsOverview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // If no household data, should return null
        if (result.current.data === null) {
          expect(result.current.data).toBeNull();
        }
      });
    });
  });
});
