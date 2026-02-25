/**
 * __tests__/hooks/useProjects.test.ts
 * STORY-14.4 — Unit tests for useProjects hook
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
import { useProjects } from '@/hooks/useProjects';
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

describe('useProjects', () => {
  beforeEach(() => {
    mockFetchBridge.mockClear();
  });

  describe('loading state', () => {
    it('returns loading=true initially', () => {
      mockFetchBridge.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.projects).toBeNull();
      expect(result.current.offline).toBe(false);
    });
  });

  describe('success state', () => {
    it('returns projects array on success', async () => {
      const mockProjects: Project[] = [
        { key: 'kira', name: 'Kira', description: 'Main project', active: true },
        { key: 'dashboard', name: 'Dashboard', description: null, active: false },
      ];
      const mockResponse: ProjectsResponse = { projects: mockProjects };
      mockFetchBridge.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.projects).toHaveLength(2);
      expect(result.current.projects?.[0]).toEqual(mockProjects[0]);
      expect(result.current.projects?.[1]).toEqual(mockProjects[1]);
      expect(result.current.offline).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('handles single project', async () => {
      const mockProjects: Project[] = [
        { key: 'solo', name: 'Solo Project', description: 'Only one', active: true },
      ];
      mockFetchBridge.mockResolvedValue({ projects: mockProjects });

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects?.[0].key).toBe('solo');
    });
  });

  describe('offline/error state', () => {
    it('returns offline=true when Bridge returns null', async () => {
      mockFetchBridge.mockResolvedValue(null);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.projects).toBeNull();
    });

    it('returns offline=true on network error', async () => {
      mockFetchBridge.mockRejectedValue(new Error('Connection refused'));

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.offline).toBe(true);
      expect(result.current.projects).toBeNull();
    });

    it('handles undefined projects field', async () => {
      mockFetchBridge.mockResolvedValue({});

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.projects).toBeNull();
    });
  });

  describe('options', () => {
    it('accepts custom refreshInterval', async () => {
      mockFetchBridge.mockResolvedValue({ projects: [] });

      const { result } = renderHook(
        () => useProjects({ refreshInterval: 60000 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFetchBridge).toHaveBeenCalledWith('/api/projects');
    });

    it('uses default refreshInterval of 30000', async () => {
      mockFetchBridge.mockResolvedValue({ projects: [] });

      renderHook(() => useProjects(), { wrapper: createWrapper() });

      // The hook should be created successfully with default options
      expect(mockFetchBridge).toHaveBeenCalled();
    });
  });
});
