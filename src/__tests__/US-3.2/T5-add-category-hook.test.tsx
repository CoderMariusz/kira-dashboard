import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

global.fetch = vi.fn();

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

describe('T5: useAddCategory Mutation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1: should call POST /api/shopping/categories with correct data', async () => {
    const { useAddCategory } = await import('@/lib/hooks/useAddCategory');

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'cat-new',
        name: 'New Category',
        icon: '🎯',
        color: '#FF5722',
        position: 100,
        is_default: false,
        created_at: new Date().toISOString(),
      }),
    } as Response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddCategory(), { wrapper });

    result.current.mutate({
      name: 'New Category',
      icon: '🎯',
      color: '#FF5722',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/shopping/categories',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"name":"New Category"'),
      })
    );
  });

  it('AC2: should invalidate categories query on success', async () => {
    const { useAddCategory } = await import('@/lib/hooks/useAddCategory');

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'cat-new',
        name: 'New Category',
        icon: '📦',
        color: '#6B7280',
        position: 100,
        is_default: false,
        created_at: new Date().toISOString(),
      }),
    } as Response);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAddCategory(), { wrapper });

    result.current.mutate({
      name: 'New Category',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['categories'],
    });
  });

  it('AC3: should handle errors and expose error state', async () => {
    const { useAddCategory } = await import('@/lib/hooks/useAddCategory');

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to create category' }),
    } as Response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddCategory(), { wrapper });

    result.current.mutate({
      name: 'New Category',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('AC4: should return mutation object with correct properties', async () => {
    const { useAddCategory } = await import('@/lib/hooks/useAddCategory');

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddCategory(), { wrapper });

    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('isSuccess');
    expect(result.current).toHaveProperty('isError');
  });
});
