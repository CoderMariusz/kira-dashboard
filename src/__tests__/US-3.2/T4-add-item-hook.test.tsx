import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

global.fetch = vi.fn();

vi.mock('@/lib/utils/categoryDetection', () => ({
  detectCategory: vi.fn(() => 'cat-1'),
}));

vi.mock('@/lib/hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    data: [
      { id: 'cat-1', name: 'Nabiał', icon: '🥛', color: '#3b82f6', position: 1, is_default: true, created_at: '2024-01-01' },
    ],
    isLoading: false,
  })),
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
// TESTS
// ═══════════════════════════════════════════

describe('T4: useAddItem Mutation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1: should call POST /api/shopping/items with correct data', async () => {
    const { useAddItem } = await import('@/lib/hooks/useAddItem');

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'item-1',
        list_id: 'list-1',
        name: 'Milk',
        quantity: 1,
        unit: 'l',
        category_id: 'cat-1',
        category_name: 'Nabiał',
        store: null,
        is_bought: false,
        added_by: 'profile-1',
        bought_by: null,
        estimated_price: null,
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as Response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddItem('list-1'), { wrapper });

    result.current.mutate({
      name: 'Milk',
      quantity: 1,
      unit: 'l',
      category_id: 'cat-1',
      category_name: 'Nabiał',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/shopping/items',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"name":"Milk"'),
      })
    );
  });

  it('AC2: should add temporary item to cache optimistically', async () => {
    const { useAddItem } = await import('@/lib/hooks/useAddItem');

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                id: 'item-1',
                list_id: 'list-1',
                name: 'Milk',
                quantity: 1,
                unit: 'l',
                category_id: 'cat-1',
                category_name: 'Nabiał',
                store: null,
                is_bought: false,
                added_by: 'profile-1',
                bought_by: null,
                estimated_price: null,
                source: 'manual',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }),
            } as Response);
          }, 100);
        })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['shopping', 'list-1'], []);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAddItem('list-1'), { wrapper });

    result.current.mutate({
      name: 'Milk',
      quantity: 1,
      unit: 'l',
      category_id: 'cat-1',
      category_name: 'Nabiał',
    });

    // Wait for onMutate (async) to complete and add temp item to cache
    await waitFor(() => {
      const cacheData = queryClient.getQueryData(['shopping', 'list-1']) as any[];
      expect(cacheData).toBeDefined();
      expect(cacheData.length).toBeGreaterThan(0);
      expect(cacheData[0].name).toBe('Milk');
      expect(cacheData[0].id).toMatch(/^temp-/);
    });
  });

  it('AC3: should rollback temp item on error', async () => {
    const { useAddItem } = await import('@/lib/hooks/useAddItem');

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to create item' }),
    } as Response);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(['shopping', 'list-1'], []);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAddItem('list-1'), { wrapper });

    result.current.mutate({
      name: 'Milk',
      quantity: 1,
      category_id: 'cat-1',
      category_name: 'Nabiał',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Check if temp item was removed from cache
    const cacheData = queryClient.getQueryData(['shopping', 'list-1']) as any[];
    expect(cacheData).toEqual([]);
  });

  it('AC4: should invalidate query on success', async () => {
    const { useAddItem } = await import('@/lib/hooks/useAddItem');

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'item-1',
        list_id: 'list-1',
        name: 'Milk',
        quantity: 1,
        unit: 'l',
        category_id: 'cat-1',
        category_name: 'Nabiał',
        store: null,
        is_bought: false,
        added_by: 'profile-1',
        bought_by: null,
        estimated_price: null,
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as Response);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAddItem('list-1'), { wrapper });

    result.current.mutate({
      name: 'Milk',
      quantity: 1,
      category_id: 'cat-1',
      category_name: 'Nabiał',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['shopping', 'list-1'],
    });
  });

  it('AC5: should use detectCategory if no category_id provided', async () => {
    const { useAddItem } = await import('@/lib/hooks/useAddItem');
    const { detectCategory } = await import('@/lib/utils/categoryDetection');

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'item-1',
        list_id: 'list-1',
        name: 'Mleko',
        quantity: 1,
        unit: null,
        category_id: 'cat-1',
        category_name: 'Nabiał',
        store: null,
        is_bought: false,
        added_by: 'profile-1',
        bought_by: null,
        estimated_price: null,
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as Response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddItem('list-1'), { wrapper });

    result.current.mutate({
      name: 'Mleko',
      quantity: 1,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(detectCategory).toHaveBeenCalledWith('Mleko', expect.anything());
  });
});
