/**
 * __tests__/hooks/useModels.test.ts
 * STORY-14.4 — Unit tests for useModels hook
 */

import { jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

// ─── Mock fetch ──────────────────────────────────────────────────────────────
const mockFetch = jest.fn<Promise<Response>, [string]>();
global.fetch = mockFetch as typeof fetch;

// ─── Imports ─────────────────────────────────────────────────────────────────
import { useModels } from '@/hooks/useModels';
import type { ModelEntry } from '@/types/models';

// Wrapper for SWR
const createWrapper = () => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    );
  };
};

describe('useModels', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('loading state', () => {
    it('returns isLoading=true initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.models).toEqual([]);
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('success state', () => {
    it('returns models array on success', async () => {
      const mockModels: ModelEntry[] = [
        {
          alias: 'kimi',
          canonical_key: 'kimi-k2.5',
          display_name: 'Kimi K2.5',
          provider: 'Moonshot AI',
          model_id: 'kimi-k2.5-latest',
          cost_input_per_1m: 0.5,
          cost_output_per_1m: 2.0,
          monitoring_enabled: true,
          stats: null,
        },
        {
          alias: 'sonnet',
          canonical_key: 'sonnet-4.6',
          display_name: 'Sonnet 4.6',
          provider: 'Anthropic',
          model_id: 'claude-3-5-sonnet-20241022',
          cost_input_per_1m: 3.0,
          cost_output_per_1m: 15.0,
          monitoring_enabled: true,
          stats: null,
        },
      ];
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockModels }),
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.models).toHaveLength(2);
      expect(result.current.models[0]).toEqual(mockModels[0]);
      expect(result.current.models[1]).toEqual(mockModels[1]);
      expect(result.current.error).toBeUndefined();
    });

    it('returns empty array when API returns empty data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.models).toEqual([]);
    });

    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      renderHook(() => useModels(), { wrapper: createWrapper() });

      expect(mockFetch).toHaveBeenCalledWith('/api/models');
    });

    it('returns mutate function', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.mutate).toBe('function');
    });
  });

  describe('error state', () => {
    it('returns error on 400 Bad Request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Nieprawidłowe żądanie');
      expect(result.current.models).toEqual([]);
    });

    it('returns error on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error?.message).toBe('Brak dostępu — zaloguj się ponownie');
    });

    it('returns error on 403 Forbidden', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error?.message).toBe('Brak uprawnień');
    });

    it('returns error on 404 Not Found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error?.message).toBe('Nie znaleziono danych');
    });

    it('returns error on 500 Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error?.message).toBe('Błąd serwera — spróbuj ponownie');
    });

    it('returns generic error for unknown status codes', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 418,
      } as Response);

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error?.message).toBe('Błąd 418');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useModels(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeDefined();
    });
  });
});
