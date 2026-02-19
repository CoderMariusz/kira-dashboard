import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T2: Create Data Hooks
 * Tests for useCategories and useShopping hooks
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
        order: vi.fn(() => Promise.resolve({
          data: [],
          error: null,
        })),
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null,
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

describe('T2: Data Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCategories', () => {
    it('AC1: should fetch from shopping_categories ordered by position', async () => {
      const { useCategories } = await import('@/lib/hooks/useCategories');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              { id: '1', name: 'Vegetables', position: 0 },
              { id: '2', name: 'Fruits', position: 1 },
            ],
            error: null,
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockFrom).toHaveBeenCalledWith('shopping_categories');
      expect(result.current.data).toHaveLength(2);
    });

    it('AC3: should use React Query with proper queryKey', async () => {
      const { useCategories } = await import('@/lib/hooks/useCategories');

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      // Query key should be ['categories'] or similar
      await waitFor(() => {
        expect(result.current).toHaveProperty('data');
      });
    });

    it('AC4: should return { data, isLoading } structure', async () => {
      const { useCategories } = await import('@/lib/hooks/useCategories');

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('AC5: should create Supabase client per-hook (follows CLAUDE.md convention)', async () => {
      const { useCategories } = await import('@/lib/hooks/useCategories');
      const { createClient } = await import('@/lib/supabase/client');

      renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(createClient).toHaveBeenCalled();
      });
    });
  });

  describe('useShopping', () => {
    it('AC2: should fetch items filtered by list_id', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');
      const { createClient } = await import('@/lib/supabase/client');

      const testListId = 'list-123';
      const mockEq = vi.fn(() => Promise.resolve({
        data: [
          { id: '1', name: 'Milk', list_id: testListId },
          { id: '2', name: 'Bread', list_id: testListId },
        ],
        error: null,
      }));

      const mockSelect = vi.fn(() => ({
        eq: mockEq,
      }));

      const mockFrom = vi.fn(() => ({
        select: mockSelect,
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const { result } = renderHook(() => useShopping(testListId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockFrom).toHaveBeenCalledWith('shopping_items');
      expect(mockEq).toHaveBeenCalledWith('list_id', testListId);
    });

    it('AC3: should use React Query with proper queryKey including listId', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');

      const testListId = 'list-123';
      const { result } = renderHook(() => useShopping(testListId), {
        wrapper: createWrapper(),
      });

      // Query key should include listId: ['shopping', listId]
      await waitFor(() => {
        expect(result.current).toHaveProperty('data');
      });
    });

    it('AC4: should return { data, isLoading } structure', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');

      const { result } = renderHook(() => useShopping('list-123'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('AC5: should create Supabase client per-hook', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');
      const { createClient } = await import('@/lib/supabase/client');

      renderHook(() => useShopping('list-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(createClient).toHaveBeenCalled();
      });
    });
  });
});
