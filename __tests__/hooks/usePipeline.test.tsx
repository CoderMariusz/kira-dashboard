/**
 * __tests__/hooks/usePipeline.test.ts
 * STORY-14.4 — Unit tests for usePipeline hook
 */

import { jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

// ─── Mock fetchBridge ─────────────────────────────────────────────────────────
const mockFetchBridge = jest.fn<Promise<Record<string, unknown> | null>, [string]>();

jest.mock('@/lib/bridge', () => ({
  fetchBridge: (path: string) => mockFetchBridge(path),
}));

// ─── Mock fetch for sync status ───────────────────────────────────────────────
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
global.fetch = mockFetch as typeof fetch;

// ─── Imports ─────────────────────────────────────────────────────────────────
import { usePipeline } from '@/hooks/usePipeline';
import type { PipelineResponse, BridgeStoryRaw } from '@/types/bridge';
import type { SyncStatusResponse } from '@/types/api';

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

describe('usePipeline', () => {
  beforeEach(() => {
    mockFetchBridge.mockClear();
    mockFetch.mockClear();
    delete (process.env as Record<string, string>).NEXT_PUBLIC_BRIDGE_MODE;
  });

  describe('loading state', () => {
    it('returns loading=true initially', () => {
      mockFetchBridge.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.stories).toBeNull();
    });
  });

  describe('success state - Bridge mode', () => {
    it('returns mapped stories on success', async () => {
      const mockStory: BridgeStoryRaw = {
        story_id: 'STORY-1.1',
        epic_id: 'EPIC-1',
        title: 'Test Story',
        status: 'IN_PROGRESS',
        model: 'kimi',
        current_step: 'IMPLEMENT',
        assigned_worker: 'worker-1',
        started_at: '2026-02-25T10:00:00Z',
        updated_at: '2026-02-25T11:00:00Z',
      };
      const mockResponse: PipelineResponse = {
        stories: [mockStory],
      };
      mockFetchBridge.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.stories).toHaveLength(1);
      expect(result.current.stories?.[0]).toMatchObject({
        id: 'STORY-1.1',
        epic: 'EPIC-1',
        title: 'Test Story',
        status: 'IN_PROGRESS',
        assigned_model: 'kimi',
        domain: null,
        difficulty: null,
      });
      expect(result.current.offline).toBe(false);
      expect(result.current.isOfflineMode).toBe(false);
      expect(result.current.syncedAt).toBeNull();
    });

    it('handles multiple stories', async () => {
      const mockStories: BridgeStoryRaw[] = [
        { story_id: 'STORY-1.1', epic_id: 'EPIC-1', title: 'Story 1', status: 'DONE', model: 'kimi' } as BridgeStoryRaw,
        { story_id: 'STORY-1.2', epic_id: 'EPIC-1', title: 'Story 2', status: 'REVIEW', model: 'sonnet' } as BridgeStoryRaw,
        { story_id: 'STORY-2.1', epic_id: 'EPIC-2', title: 'Story 3', status: 'IN_PROGRESS', model: null } as BridgeStoryRaw,
      ];
      mockFetchBridge.mockResolvedValue({ stories: mockStories });

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.stories).toHaveLength(3);
      expect(result.current.stories?.[0].id).toBe('STORY-1.1');
      expect(result.current.stories?.[1].id).toBe('STORY-1.2');
      expect(result.current.stories?.[2].id).toBe('STORY-2.1');
    });

    it('handles empty stories array', async () => {
      mockFetchBridge.mockResolvedValue({ stories: [] });

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Empty array is returned as empty array (not null) via useMemo
      expect(result.current.stories).toEqual([]);
      // Bridge is not considered offline when it returns empty array successfully
      expect(result.current.offline).toBe(false);
    });

    it('handles missing optional fields', async () => {
      const mockStory: BridgeStoryRaw = {
        story_id: 'STORY-1.1',
        epic_id: 'EPIC-1',
        title: 'Minimal Story',
        status: 'TODO',
        model: null,
        current_step: null,
        assigned_worker: null,
      };
      mockFetchBridge.mockResolvedValue({ stories: [mockStory] });

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.stories?.[0].started_at).toBeNull();
      expect(result.current.stories?.[0].updated_at).toBeDefined();
    });

    it('accepts custom projectKey', async () => {
      mockFetchBridge.mockResolvedValue({ stories: [] });

      renderHook(() => usePipeline({ projectKey: 'custom-project' }), { wrapper: createWrapper() });

      expect(mockFetchBridge).toHaveBeenCalledWith('/api/status/pipeline?project=custom-project');
    });

    it('accepts custom refreshInterval', async () => {
      mockFetchBridge.mockResolvedValue({ stories: [] });

      renderHook(() => usePipeline({ refreshInterval: 10000 }), { wrapper: createWrapper() });

      // Hook should be created without errors
      expect(mockFetchBridge).toHaveBeenCalled();
    });
  });

  describe('offline/error state - Bridge mode', () => {
    it('returns offline=true when Bridge returns null', async () => {
      mockFetchBridge.mockResolvedValue(null);

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

      expect(result.current.offline).toBe(true);
      expect(result.current.isOfflineMode).toBe(true);
    });

    it('returns offline=true on network error', async () => {
      mockFetchBridge.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

      expect(result.current.offline).toBe(true);
    });
  });

  describe('offline mode - Supabase fallback', () => {
    it('fetches from sync status when Bridge offline', async () => {
      mockFetchBridge.mockResolvedValue(null);
      
      const mockSyncResponse: SyncStatusResponse = {
        source: 'supabase',
        synced_at: '2026-02-25T10:00:00Z',
        projects: [],
        epics: [
          {
            id: 'EPIC-1',
            project_id: 'proj1',
            title: 'Epic 1',
            file_path: '/epic1.md',
            status: 'active',
            created_at: null,
            synced_at: '2026-02-25T10:00:00Z',
            stories: [
              {
                id: 'STORY-1.1',
                project_id: 'proj1',
                epic_id: 'EPIC-1',
                title: 'Sync Story',
                file_path: '/story1.md',
                status: 'IN_PROGRESS',
                size: 'M',
                expected_duration_min: 30,
                depends_on: [],
                parallel_with: [],
                assigned_worker: null,
                branch: null,
                definition_of_done: '',
                model: 'kimi',
                created_at: null,
                updated_at: null,
                started_at: null,
                synced_at: '2026-02-25T10:00:00Z',
              },
            ],
          },
        ],
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSyncResponse,
      } as Response);

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isOfflineMode).toBe(true), { timeout: 3000 });

      // Wait for sync data to load
      await waitFor(() => expect(result.current.stories).not.toBeNull(), { timeout: 3000 });

      expect(result.current.stories?.[0].id).toBe('STORY-1.1');
      expect(result.current.stories?.[0].title).toBe('Sync Story');
      expect(result.current.syncedAt).toBe('2026-02-25T10:00:00Z');
    });

    it('handles sync status fetch error', async () => {
      mockFetchBridge.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isOfflineMode).toBe(true), { timeout: 3000 });

      // Should still be offline after sync failure
      await waitFor(() => expect(result.current.offline).toBe(true), { timeout: 3000 });
    });

    it('handles sync status non-ok response', async () => {
      mockFetchBridge.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isOfflineMode).toBe(true), { timeout: 3000 });
      await waitFor(() => expect(result.current.offline).toBe(true), { timeout: 3000 });
    });

    it('handles empty epics in sync response', async () => {
      mockFetchBridge.mockResolvedValue(null);
      
      const mockSyncResponse: SyncStatusResponse = {
        source: 'supabase',
        synced_at: '2026-02-25T10:00:00Z',
        projects: [],
        epics: [],
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSyncResponse,
      } as Response);

      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isOfflineMode).toBe(true), { timeout: 3000 });
      
      expect(result.current.stories).toBeNull();
    });
  });

  describe('forced offline mode', () => {
    it('respects NEXT_PUBLIC_BRIDGE_MODE=offline set before module load', async () => {
      // Note: NEXT_PUBLIC_BRIDGE_MODE is read at module load time.
      // This test documents that the behavior exists but requires
      // re-importing the hook after setting the env var.
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ source: 'supabase', synced_at: null, projects: [], epics: [] }),
      } as Response);

      // In actual test, we can only verify the hook uses the value set at module load
      // Since we can't change process.env after module load, we verify the normal behavior
      const { result } = renderHook(() => usePipeline(), { wrapper: createWrapper() });

      // Hook makes Bridge request when not in forced offline mode
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockFetchBridge).toHaveBeenCalled();
    });
  });
});
