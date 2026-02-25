/**
 * __tests__/hooks/useRuns.test.ts
 * STORY-14.4 — Unit tests for useRuns hook
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
import { useRuns } from '@/hooks/useRuns';
import type { RunsResponse, BridgeRunRaw } from '@/types/bridge';

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

describe('useRuns', () => {
  beforeEach(() => {
    mockFetchBridge.mockClear();
  });

  describe('loading state', () => {
    it('returns loading=true initially', () => {
      mockFetchBridge.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.runs).toBeNull();
      expect(result.current.offline).toBe(false);
    });
  });

  describe('success state', () => {
    it('returns mapped runs on success', async () => {
      const mockRun: BridgeRunRaw = {
        run_id: 'run-001',
        story_id: 'STORY-1.1',
        step: 'IMPLEMENT',
        worker: 'worker-1',
        model: 'kimi',
        status: 'DONE',
        started_at: '2026-02-25T10:00:00Z',
        ended_at: '2026-02-25T10:05:00Z',
        duration_ms: 300000,
        retry_count: 0,
        tokens_in: 1000,
        tokens_out: 500,
        cost_usd: 0.05,
        artifacts: [],
      };
      const mockResponse: RunsResponse = { runs: [mockRun] };
      mockFetchBridge.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.runs).toHaveLength(1);
      expect(result.current.runs?.[0]).toMatchObject({
        id: 'run-001',
        story_id: 'STORY-1.1',
        step: 'IMPLEMENT',
        model: 'kimi',
        status: 'DONE',
        created_at: '2026-02-25T10:00:00Z',
        finished_at: '2026-02-25T10:05:00Z',
        duration_seconds: 300,
        cost_estimate: 0.05,
        input_tokens: 1000,
        output_tokens: 500,
      });
      expect(result.current.offline).toBe(false);
    });

    it('correctly converts duration_ms to duration_seconds', async () => {
      const mockRun: BridgeRunRaw = {
        run_id: 'run-002',
        story_id: 'STORY-1.2',
        step: 'REVIEW',
        worker: null,
        model: 'sonnet',
        status: 'DONE',
        started_at: '2026-02-25T10:00:00Z',
        ended_at: '2026-02-25T10:02:30Z',
        duration_ms: 150000,
        retry_count: 1,
        tokens_in: null,
        tokens_out: null,
        cost_usd: null,
        artifacts: [],
      };
      mockFetchBridge.mockResolvedValue({ runs: [mockRun] });

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.runs?.[0].duration_seconds).toBe(150);
    });

    it('handles null duration_ms', async () => {
      const mockRun: BridgeRunRaw = {
        run_id: 'run-003',
        story_id: 'STORY-1.3',
        step: 'IMPLEMENT',
        worker: null,
        model: 'codex',
        status: 'IN_PROGRESS',
        started_at: '2026-02-25T10:00:00Z',
        ended_at: null,
        duration_ms: null,
        retry_count: 0,
        tokens_in: null,
        tokens_out: null,
        cost_usd: null,
        artifacts: [],
      };
      mockFetchBridge.mockResolvedValue({ runs: [mockRun] });

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.runs?.[0].duration_seconds).toBeNull();
      expect(result.current.runs?.[0].finished_at).toBeNull();
    });

    it('handles multiple runs', async () => {
      const mockRuns: BridgeRunRaw[] = [
        {
          run_id: 'run-001',
          story_id: 'STORY-1.1',
          step: 'IMPLEMENT',
          worker: 'w1',
          model: 'kimi',
          status: 'DONE',
          started_at: '2026-02-25T09:00:00Z',
          ended_at: '2026-02-25T09:05:00Z',
          duration_ms: 300000,
          retry_count: 0,
          tokens_in: 1000,
          tokens_out: 500,
          cost_usd: 0.05,
          artifacts: [],
        },
        {
          run_id: 'run-002',
          story_id: 'STORY-1.2',
          step: 'REVIEW',
          worker: null,
          model: 'sonnet',
          status: 'REFACTOR',
          started_at: '2026-02-25T10:00:00Z',
          ended_at: '2026-02-25T10:03:00Z',
          duration_ms: 180000,
          retry_count: 0,
          tokens_in: 2000,
          tokens_out: 1000,
          cost_usd: 0.10,
          artifacts: [],
        },
      ];
      mockFetchBridge.mockResolvedValue({ runs: mockRuns });

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.runs).toHaveLength(2);
      expect(result.current.runs?.[0].id).toBe('run-001');
      expect(result.current.runs?.[1].id).toBe('run-002');
    });

    it('uses null for cost when cost_usd is null', async () => {
      const mockRun: BridgeRunRaw = {
        run_id: 'run-004',
        story_id: 'STORY-1.4',
        step: 'IMPLEMENT',
        worker: null,
        model: 'haiku',
        status: 'FAILED',
        started_at: '2026-02-25T10:00:00Z',
        ended_at: '2026-02-25T10:01:00Z',
        duration_ms: 60000,
        retry_count: 2,
        tokens_in: 500,
        tokens_out: 200,
        cost_usd: null,
        artifacts: [],
      };
      mockFetchBridge.mockResolvedValue({ runs: [mockRun] });

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.runs?.[0].cost_estimate).toBeNull();
    });
  });

  describe('offline/error state', () => {
    it('returns offline=true when Bridge returns null', async () => {
      mockFetchBridge.mockResolvedValue(null);

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.runs).toBeNull();
    });

    it('returns offline=true on network error', async () => {
      mockFetchBridge.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.runs).toBeNull();
    });

    it('handles empty runs array', async () => {
      mockFetchBridge.mockResolvedValue({ runs: [] });

      const { result } = renderHook(() => useRuns(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Empty runs array maps to empty array, not null
      expect(result.current.runs).toEqual([]);
      // Bridge is not offline when it returns empty array successfully
      expect(result.current.offline).toBe(false);
    });
  });

  describe('options', () => {
    it('accepts custom refreshInterval', async () => {
      mockFetchBridge.mockResolvedValue({ runs: [] });

      const { result } = renderHook(
        () => useRuns({ refreshInterval: 60000 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFetchBridge).toHaveBeenCalledWith('/api/status/runs');
    });
  });
});
