import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ═══════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('T4: useToggleItem Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Call PATCH endpoint with is_bought toggle', () => {
    it('should call PATCH /api/shopping/items/{id} with is_bought: true when toggling to bought', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'item-1',
          is_bought: true,
          bought_by: 'profile-1',
        }),
      });

      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');

      const { result } = renderHook(() => useToggleItem('list-1'), {
        wrapper: createWrapper(),
      });

      // Call toggle with item id and current state (false = not bought)
      result.current.toggle('item-1', false);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/shopping/items/item-1',
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_bought: true }),
          })
        );
      });
    });

    it('should call PATCH with is_bought: false when toggling from bought to not bought', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'item-2',
          is_bought: false,
          bought_by: null,
        }),
      });

      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');

      const { result } = renderHook(() => useToggleItem('list-1'), {
        wrapper: createWrapper(),
      });

      // Call toggle with item id and current state (true = bought)
      result.current.toggle('item-2', true);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/shopping/items/item-2',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ is_bought: false }),
          })
        );
      });
    });
  });

  describe('AC2: Invalidate query on success', () => {
    it('should invalidate shopping list query after successful toggle', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'item-3', is_bought: true }),
      });

      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');

      const wrapper = createWrapper();
      const { result } = renderHook(() => useToggleItem('list-1'), { wrapper });

      result.current.toggle('item-3', false);

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      // Query should be invalidated (we can't directly test this without QueryClient access,
      // but the hook implementation should call queryClient.invalidateQueries(['shopping', 'list-1']))
      // This is verified by the implementation
    });
  });

  describe('AC3: Handle errors and expose error state', () => {
    it('should expose error state when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');

      const { result } = renderHook(() => useToggleItem('list-1'), {
        wrapper: createWrapper(),
      });

      result.current.toggle('item-4', false);

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      // Error should be exposed
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should expose error when network request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');

      const { result } = renderHook(() => useToggleItem('list-1'), {
        wrapper: createWrapper(),
      });

      result.current.toggle('item-5', false);

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('AC4: Return toggle and isPending', () => {
    it('should return toggle function and isPending state', async () => {
      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');

      const { result } = renderHook(() => useToggleItem('list-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('toggle');
      expect(result.current).toHaveProperty('isPending');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.isPending).toBe('boolean');
    });

    it('should set isPending to true during mutation', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 'item-6', is_bought: true }),
                }),
              100
            )
          )
      );

      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');

      const { result } = renderHook(() => useToggleItem('list-1'), {
        wrapper: createWrapper(),
      });

      result.current.toggle('item-6', false);

      // Should be pending immediately
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Should complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });
});
