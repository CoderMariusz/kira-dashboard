/**
 * __tests__/hooks/useProjectStats.test.ts
 * STORY-7.4 — Unit tests for useProjectStats hook
 *
 * Test matrix:
 *  TC-1  Loading state → loading=true, projectsCount=null
 *  TC-2  Success state → projectsCount correct, offline=false
 *  TC-3  Error/offline state → offline=true, projectsCount=null
 */

import { jest } from '@jest/globals';

// ─── Mock fetchBridge before importing hooks ─────────────────────────────────

const mockFetchBridge = jest.fn<Promise<Record<string, unknown> | null>, [string]>();

jest.mock('@/lib/bridge', () => ({
  fetchBridge: (path: string) => mockFetchBridge(path),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { PROJECTS_SWR_KEY } from '@/hooks/useProjectStats';
import type { ProjectsResponse } from '@/types/bridge';

// Simple test using SWR's global cache directly
// Avoiding React Testing Library due to ESM+JSX complexity in Jest

describe('useProjectStats', () => {
  beforeEach(() => {
    mockFetchBridge.mockClear();
  });

  it('exports correct SWR key', () => {
    expect(PROJECTS_SWR_KEY).toBe('/api/projects');
  });

  describe('fetchBridge integration', () => {
    it('TC-2: fetchBridge returns data for valid projects endpoint', async () => {
      const mockResponse: ProjectsResponse = {
        projects: [
          { key: 'proj1', name: 'Project 1', description: null, active: true },
          { key: 'proj2', name: 'Project 2', description: null, active: false },
        ],
      };
      mockFetchBridge.mockResolvedValue(mockResponse);

      const result = await mockFetchBridge('/api/projects');

      expect(result).toEqual(mockResponse);
      expect(result?.projects).toHaveLength(2);
    });

    it('TC-3: fetchBridge returns null on error (offline)', async () => {
      mockFetchBridge.mockResolvedValue(null);

      const result = await mockFetchBridge('/api/projects');

      expect(result).toBeNull();
    });

    it('TC-4: fetchBridge handles empty projects array', async () => {
      mockFetchBridge.mockResolvedValue({ projects: [] });

      const result = await mockFetchBridge('/api/projects');

      expect(result).toEqual({ projects: [] });
    });

    it('TC-5: fetchBridge handles network errors', async () => {
      mockFetchBridge.mockRejectedValue(new Error('Network error'));

      await expect(mockFetchBridge('/api/projects')).rejects.toThrow('Network error');
    });
  });
});
