/**
 * __tests__/hooks/useSystemStatus.test.ts
 * STORY-10.6 — Unit tests for useSystemStatus, useApiKeys, useCronJobs hooks
 */

import { jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';

// ─── Mock fetch globally ──────────────────────────────────────────────────────
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
global.fetch = mockFetch as typeof fetch;

// ─── Imports (after mocks) ───────────────────────────────────────────────────
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useCronJobs } from '@/hooks/useCronJobs';
import type { SystemStatusResponse, ApiKeyMeta, CronJob } from '@/types/system.types';

// ─── Test data ────────────────────────────────────────────────────────────────
const mockStatus: SystemStatusResponse = {
  openclaw: {
    version: '1.0.0',
    uptime: 3600,
    channels: {
      whatsapp: true,
      telegram: false,
    },
  },
  bridge: {
    status: 'UP',
    version: '1.0.0',
    lastError: null,
  },
};

const mockApiKeys: ApiKeyMeta[] = [
  {
    name: 'OPENAI_API_KEY',
    maskedValue: 'sk-****abcd',
    status: 'active',
    expiresAt: null,
  },
];

const mockCronJobs: CronJob[] = [
  {
    name: 'digest-cleanup',
    schedule: '0 2 * * *',
    lastRun: '2026-02-25T02:00:00Z',
    lastStatus: 'success',
  },
];

// ─── SWR wrapper ──────────────────────────────────────────────────────────────
const createWrapper = () => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0 } },
      children,
    );
  };
};

// ─── Helper: make a successful fetch response ─────────────────────────────────
function makeFetchResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function makeErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error: `HTTP ${status}` }),
    text: async () => JSON.stringify({ error: `HTTP ${status}` }),
  } as Response;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: useSystemStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('useSystemStatus', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('loading state', () => {
    it('returns isLoading=true initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('success state', () => {
    it('returns data on success', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse(mockStatus));

      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockStatus);
      expect(result.current.error).toBeUndefined();
    });

    it('calls /api/system/status', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse(mockStatus));

      renderHook(() => useSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = (mockFetch.mock.calls[0][0] as string);
      expect(calledUrl).toContain('/api/system/status');
    });

    it('exposes refresh function', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse(mockStatus));

      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.refresh).toBe('function');
    });

    it('refresh() triggers re-fetch', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse(mockStatus));

      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const fetchCountBefore = mockFetch.mock.calls.length;
      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetch.mock.calls.length).toBeGreaterThan(fetchCountBefore);
    });
  });

  describe('error state', () => {
    it('sets error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).not.toBeUndefined();
      expect(result.current.data).toBeUndefined();
    });

    it('error.message is in Polish on 503', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(503));

      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).not.toBeUndefined());

      expect(result.current.error?.message).toMatch(/Bridge jest niedostępny/);
    });

    it('error.message is in Polish on 500', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500));

      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).not.toBeUndefined());

      expect(result.current.error?.message).toMatch(/Błąd serwera systemu/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: useApiKeys
// ─────────────────────────────────────────────────────────────────────────────

describe('useApiKeys', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('loading state', () => {
    it('returns isLoading=true initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useApiKeys(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.keys).toBeUndefined();
    });
  });

  describe('success state', () => {
    it('returns keys array on success', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ keys: mockApiKeys }));

      const { result } = renderHook(() => useApiKeys(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.keys).toEqual(mockApiKeys);
      expect(result.current.error).toBeUndefined();
    });

    it('calls /api/system/api-keys', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ keys: mockApiKeys }));

      renderHook(() => useApiKeys(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = (mockFetch.mock.calls[0][0] as string);
      expect(calledUrl).toContain('/api/system/api-keys');
    });

    it('exposes refresh function', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ keys: mockApiKeys }));

      const { result } = renderHook(() => useApiKeys(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('error state', () => {
    it('sets error on 503 with Polish message', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(503));

      const { result } = renderHook(() => useApiKeys(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).not.toBeUndefined());

      expect(result.current.error?.message).toMatch(/Bridge jest niedostępny/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: useCronJobs
// ─────────────────────────────────────────────────────────────────────────────

describe('useCronJobs', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('loading state', () => {
    it('returns isLoading=true initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useCronJobs(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.jobs).toBeUndefined();
    });
  });

  describe('success state', () => {
    it('returns jobs array on success', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ jobs: mockCronJobs }));

      const { result } = renderHook(() => useCronJobs(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.jobs).toEqual(mockCronJobs);
      expect(result.current.error).toBeUndefined();
    });

    it('calls /api/system/cron-jobs', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ jobs: mockCronJobs }));

      renderHook(() => useCronJobs(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = (mockFetch.mock.calls[0][0] as string);
      expect(calledUrl).toContain('/api/system/cron-jobs');
    });

    it('exposes refresh function', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse({ jobs: mockCronJobs }));

      const { result } = renderHook(() => useCronJobs(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.refresh).toBe('function');
    });
  });

  describe('error state', () => {
    it('sets error on 500 with Polish message', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500));

      const { result } = renderHook(() => useCronJobs(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).not.toBeUndefined());

      expect(result.current.error?.message).toMatch(/Błąd serwera systemu/);
    });
  });
});
