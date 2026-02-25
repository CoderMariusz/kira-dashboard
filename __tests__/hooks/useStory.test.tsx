/**
 * __tests__/hooks/useStory.test.ts
 * STORY-14.4 — Unit tests for useStory hook
 */

import { jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig, mutate } from 'swr';

// ─── Mock fetch ──────────────────────────────────────────────────────────────
const mockFetch = jest.fn<Promise<Response>, [string]>();
global.fetch = mockFetch as typeof fetch;

// ─── Mock SWR mutate ──────────────────────────────────────────────────────────
jest.mock('swr', () => ({
  __esModule: true,
  ...jest.requireActual('swr'),
  mutate: jest.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────
import { useStory } from '@/hooks/useStory';
import type { Story, StoryStatus, StoryPriority } from '@/types/story.types';

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

describe('useStory', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    (jest.mocked(mutate) as jest.Mock).mockClear();
  });

  describe('loading state', () => {
    it('returns isLoading=true initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useStory('STORY-1.1'), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.story).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isNotFound).toBe(false);
      expect(result.current.isOffline).toBe(false);
    });
  });

  describe('success state', () => {
    it('returns story data on success', async () => {
      const mockStory: Story = {
        id: 'STORY-1.1',
        title: 'Test Story Title',
        status: 'IN_PROGRESS' as StoryStatus,
        epic: 'EPIC-1',
        epicTitle: 'Epic One',
        domain: 'backend',
        priority: 'must' as StoryPriority,
        estimatedEffort: 3,
        assignedModel: 'kimi',
        createdAt: '2026-02-20T10:00:00Z',
        updatedAt: '2026-02-25T10:00:00Z',
        dod: ['Criterion 1', 'Criterion 2'],
        runs: [],
        lessons: [],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockStory,
      } as Response);

      const { result } = renderHook(() => useStory('STORY-1.1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.story).toEqual(mockStory);
      expect(result.current.error).toBeUndefined();
      expect(result.current.isNotFound).toBe(false);
      expect(result.current.isOffline).toBe(false);
    });

    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'STORY-2.5',
          title: 'Another Story',
          status: 'DONE',
          epic: 'EPIC-2',
          epicTitle: 'Epic Two',
          domain: 'frontend',
          priority: 'should',
          estimatedEffort: 2,
          assignedModel: 'sonnet',
          createdAt: '2026-02-20T10:00:00Z',
          updatedAt: '2026-02-25T10:00:00Z',
          dod: [],
          runs: [],
          lessons: [],
        }),
      } as Response);

      renderHook(() => useStory('STORY-2.5'), { wrapper: createWrapper() });

      expect(mockFetch).toHaveBeenCalledWith('/api/stories/STORY-2.5');
    });

    it('handles story with runs and lessons', async () => {
      const mockStory: Story = {
        id: 'STORY-3.1',
        title: 'Complex Story',
        status: 'REVIEW' as StoryStatus,
        epic: 'EPIC-3',
        epicTitle: 'Epic Three',
        domain: 'database',
        priority: 'could' as StoryPriority,
        estimatedEffort: 5,
        assignedModel: 'codex',
        createdAt: '2026-02-15T10:00:00Z',
        updatedAt: '2026-02-25T10:00:00Z',
        dod: ['DoD 1'],
        runs: [
          {
            id: 'run-1',
            step: 'IMPLEMENT',
            model: 'codex',
            status: 'success',
            duration: 120,
            startedAt: '2026-02-25T09:00:00Z',
            branch: 'feature/STORY-3.1',
          },
        ],
        lessons: [
          {
            id: 'lesson-1',
            extractedAt: '2026-02-24T10:00:00Z',
            extractedBy: 'codex',
            text: 'Lesson learned',
            tags: ['pattern'],
          },
        ],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockStory,
      } as Response);

      const { result } = renderHook(() => useStory('STORY-3.1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.story?.runs).toHaveLength(1);
      expect(result.current.story?.lessons).toHaveLength(1);
    });
  });

  describe('error state', () => {
    it('returns isNotFound=true on 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const { result } = renderHook(() => useStory('STORY-NOT-FOUND'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isNotFound).toBe(true);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.status).toBe(404);
    });

    it('returns isOffline=true on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useStory('STORY-1.1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isOffline).toBe(true);
      expect(result.current.isNotFound).toBe(false);
      expect(result.current.error).toBeDefined();
    });

    it('returns isOffline=true on non-404 errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useStory('STORY-1.1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isOffline).toBe(true);
      expect(result.current.isNotFound).toBe(false);
    });
  });

  describe('refresh function', () => {
    it('returns refresh function that calls mutate', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'STORY-1.1',
          title: 'Test Story',
          status: 'DONE',
          epic: 'EPIC-1',
          epicTitle: 'Epic One',
          domain: 'backend',
          priority: 'must',
          estimatedEffort: 2,
          assignedModel: 'kimi',
          createdAt: '2026-02-20T10:00:00Z',
          updatedAt: '2026-02-25T10:00:00Z',
          dod: [],
          runs: [],
          lessons: [],
        }),
      } as Response);

      const { result } = renderHook(() => useStory('STORY-1.1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.refresh).toBe('function');

      // Call refresh
      result.current.refresh();

      expect(mutate).toHaveBeenCalledWith('/api/stories/STORY-1.1');
    });
  });
});
