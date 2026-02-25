/**
 * __tests__/hooks/useStats.test.ts
 * STORY-14.4 — Unit tests for useStats hook
 */

import { jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

// ─── Mock fetchBridge ─────────────────────────────────────────────────────────
const mockFetchBridge = jest.fn<Promise<Record<string, unknown> | null>, [string]>();

jest.mock('@/lib/bridge', () => ({
  fetchBridge: (path: string) => mockFetchBridge(path),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────
import { useStats } from '@/hooks/useStats';
import type { PipelineStats } from '@/types/bridge';

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

describe('useStats', () => {
  beforeEach(() => {
    mockFetchBridge.mockClear();
    delete (process.env as Record<string, string>).NEXT_PUBLIC_BRIDGE_PROJECT;
  });

  describe('loading state', () => {
    it('returns loading=true initially', () => {
      mockFetchBridge.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.stats).toBeNull();
      expect(result.current.offline).toBe(false);
    });
  });

  describe('success state', () => {
    it('returns stats on success', async () => {
      const mockStats: PipelineStats = {
        key: 'kira-dashboard',
        stories_done: 42,
        total_runs: 150,
        success_rate: 0.88,
        last_run_at: '2026-02-25T10:00:00Z',
        avg_run_duration_s: 45.5,
      };
      mockFetchBridge.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.offline).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('handles stats with null last_run_at', async () => {
      const mockStats: PipelineStats = {
        key: 'new-project',
        stories_done: 0,
        total_runs: 0,
        success_rate: 0,
        last_run_at: null,
        avg_run_duration_s: 0,
      };
      mockFetchBridge.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.stats?.last_run_at).toBeNull();
      expect(result.current.stats?.stories_done).toBe(0);
    });

    it('uses default project key from env', async () => {
      (process.env as Record<string, string>).NEXT_PUBLIC_BRIDGE_PROJECT = 'my-project';
      mockFetchBridge.mockResolvedValue({
        key: 'my-project',
        stories_done: 10,
        total_runs: 50,
        success_rate: 0.9,
        last_run_at: null,
        avg_run_duration_s: 30,
      });

      renderHook(() => useStats(), { wrapper: createWrapper() });

      expect(mockFetchBridge).toHaveBeenCalledWith('/api/projects/my-project/stats');
    });

    it('uses default project key "kira-dashboard" when env not set', async () => {
      mockFetchBridge.mockResolvedValue({
        key: 'kira-dashboard',
        stories_done: 5,
        total_runs: 20,
        success_rate: 0.75,
        last_run_at: null,
        avg_run_duration_s: 60,
      });

      renderHook(() => useStats(), { wrapper: createWrapper() });

      expect(mockFetchBridge).toHaveBeenCalledWith('/api/projects/kira-dashboard/stats');
    });

    it('accepts custom projectKey', async () => {
      mockFetchBridge.mockResolvedValue({
        key: 'custom',
        stories_done: 3,
        total_runs: 10,
        success_rate: 1.0,
        last_run_at: null,
        avg_run_duration_s: 20,
      });

      renderHook(() => useStats({ projectKey: 'custom-project' }), { wrapper: createWrapper() });

      expect(mockFetchBridge).toHaveBeenCalledWith('/api/projects/custom-project/stats');
    });

    it('accepts custom refreshInterval', async () => {
      mockFetchBridge.mockResolvedValue({
        key: 'test',
        stories_done: 1,
        total_runs: 5,
        success_rate: 0.8,
        last_run_at: null,
        avg_run_duration_s: 15,
      });

      const { result } = renderHook(
        () => useStats({ refreshInterval: 10000 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFetchBridge).toHaveBeenCalled();
    });
  });

  describe('offline/error state', () => {
    it('returns offline=true when Bridge returns null', async () => {
      mockFetchBridge.mockResolvedValue(null);

      const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.stats).toBeNull();
    });

    it('returns offline=true on network error', async () => {
      mockFetchBridge.mockRejectedValue(new Error('Connection timeout'));

      const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.stats).toBeNull();
    });

    it('handles undefined data', async () => {
      // SWR wraps undefined data, but fetchBridge never returns undefined
      // It returns null on error. Testing that null is handled correctly.
      mockFetchBridge.mockResolvedValue(null);

      const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.stats).toBeNull();
    });
  });
});
