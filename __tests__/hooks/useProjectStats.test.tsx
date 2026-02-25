/**
 * __tests__/hooks/useProjectStats.test.ts
 * STORY-14.4 — Unit tests for useProjectStats hook
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
import { useProjectStats, PROJECTS_SWR_KEY } from '@/hooks/useProjectStats';
import type { ProjectsResponse, Project } from '@/types/bridge';

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

describe('useProjectStats', () => {
  beforeEach(() => {
    mockFetchBridge.mockClear();
  });

  it('exports correct SWR key', () => {
    expect(PROJECTS_SWR_KEY).toBe('/api/projects');
  });

  describe('loading state', () => {
    it('TC-1: returns loading=true initially', async () => {
      // Delay the response to ensure we catch loading state
      mockFetchBridge.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useProjectStats(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.projectsCount).toBeNull();
      expect(result.current.offline).toBe(false);
    });
  });

  describe('success state', () => {
    it('TC-2: returns projectsCount on success', async () => {
      const mockResponse: ProjectsResponse = {
        projects: [
          { key: 'proj1', name: 'Project 1', description: null, active: true } as Project,
          { key: 'proj2', name: 'Project 2', description: null, active: false } as Project,
        ],
      };
      mockFetchBridge.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProjectStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.projectsCount).toBe(2);
      expect(result.current.offline).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('TC-4: handles empty projects array', async () => {
      mockFetchBridge.mockResolvedValue({ projects: [] });

      const { result } = renderHook(() => useProjectStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.projectsCount).toBe(0);
      expect(result.current.offline).toBe(false);
    });

    it('TC-5: returns mutate function', async () => {
      const mockResponse: ProjectsResponse = {
        projects: [{ key: 'proj1', name: 'Project 1', description: null, active: true } as Project],
      };
      mockFetchBridge.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProjectStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(typeof result.current.mutate).toBe('function');
    });
  });

  describe('offline/error state', () => {
    it('TC-3: returns offline=true on error', async () => {
      mockFetchBridge.mockResolvedValue(null);

      const { result } = renderHook(() => useProjectStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.projectsCount).toBeNull();
    });

    it('handles network errors', async () => {
      mockFetchBridge.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useProjectStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.projectsCount).toBeNull();
    });

    it('handles undefined data with no error', async () => {
      // fetchBridge returns null on error, never undefined
      mockFetchBridge.mockResolvedValue(null);

      const { result } = renderHook(() => useProjectStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.projectsCount).toBeNull();
    });
  });
});
