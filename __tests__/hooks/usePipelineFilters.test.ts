/**
 * __tests__/hooks/usePipelineFilters.test.ts
 * STORY-14.4 — Unit tests for usePipelineFilters hook
 */

import { jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// ─── Mock next/navigation ────────────────────────────────────────────────────
const mockPush = jest.fn<void, [string, { scroll: boolean }]>();
const mockGet = jest.fn<string | null, [string]>();
const mockToString = jest.fn<string, []>();

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: mockGet,
    toString: mockToString,
  })),
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
  usePathname: jest.fn(() => '/dashboard'),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────
import { usePipelineFilters, VALID_STATUSES } from '@/hooks/usePipelineFilters';

describe('usePipelineFilters', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGet.mockClear();
    mockToString.mockClear();
    mockToString.mockReturnValue('');
  });

  describe('initialization', () => {
    it('initializes with empty filters when no URL params', () => {
      mockGet.mockReturnValue(null);

      const { result } = renderHook(() => usePipelineFilters());

      expect(result.current.filters).toEqual({
        status: '',
        model: '',
        project: '',
        search: '',
      });
    });

    it('initializes status from URL param', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'status') return 'IN_PROGRESS';
        return null;
      });

      const { result } = renderHook(() => usePipelineFilters());

      expect(result.current.filters.status).toBe('IN_PROGRESS');
    });

    it('initializes model from URL param', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'model') return 'kimi';
        return null;
      });

      const { result } = renderHook(() => usePipelineFilters());

      expect(result.current.filters.model).toBe('kimi');
    });

    it('initializes project from URL param', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'project') return 'kira-dashboard';
        return null;
      });

      const { result } = renderHook(() => usePipelineFilters());

      expect(result.current.filters.project).toBe('kira-dashboard');
    });

    it('initializes search from URL param', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'search') return 'story title';
        return null;
      });

      const { result } = renderHook(() => usePipelineFilters());

      expect(result.current.filters.search).toBe('story title');
    });

    it('initializes multiple filters from URL params', () => {
      mockGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          status: 'REVIEW',
          model: 'sonnet',
          project: 'kira',
        };
        return params[key] || null;
      });

      const { result } = renderHook(() => usePipelineFilters());

      expect(result.current.filters).toEqual({
        status: 'REVIEW',
        model: 'sonnet',
        project: 'kira',
        search: '',
      });
    });

    it('ignores invalid status values (EC-3)', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'status') return 'INVALID_STATUS';
        return null;
      });

      const { result } = renderHook(() => usePipelineFilters());

      expect(result.current.filters.status).toBe('');
    });

    it('accepts all valid status values', () => {
      const validStatuses = ['', 'IN_PROGRESS', 'REVIEW', 'REFACTOR', 'DONE', 'MERGE', 'BLOCKED'];
      
      for (const status of validStatuses) {
        mockGet.mockImplementation((key: string) => {
          if (key === 'status') return status;
          return null;
        });

        const { result } = renderHook(() => usePipelineFilters());
        expect(result.current.filters.status).toBe(status);
      }
    });
  });

  describe('setFilters', () => {
    it('updates single filter', () => {
      mockGet.mockReturnValue(null);

      const { result } = renderHook(() => usePipelineFilters());

      act(() => {
        result.current.setFilters({ status: 'DONE' });
      });

      expect(result.current.filters.status).toBe('DONE');
      expect(result.current.filters.model).toBe('');
      expect(result.current.filters.project).toBe('');
      expect(result.current.filters.search).toBe('');
    });

    it('updates multiple filters', () => {
      mockGet.mockReturnValue(null);

      const { result } = renderHook(() => usePipelineFilters());

      act(() => {
        result.current.setFilters({ status: 'IN_PROGRESS', model: 'kimi' });
      });

      expect(result.current.filters.status).toBe('IN_PROGRESS');
      expect(result.current.filters.model).toBe('kimi');
    });

    it('preserves existing filters when updating one', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'model') return 'sonnet';
        return null;
      });

      const { result } = renderHook(() => usePipelineFilters());

      act(() => {
        result.current.setFilters({ status: 'REVIEW' });
      });

      expect(result.current.filters.status).toBe('REVIEW');
      expect(result.current.filters.model).toBe('sonnet');
    });

    it('updates URL with new filter params', () => {
      mockGet.mockReturnValue(null);
      mockToString.mockReturnValue('tab=pipeline');

      const { result } = renderHook(() => usePipelineFilters());

      act(() => {
        result.current.setFilters({ status: 'DONE' });
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('status=DONE'),
        { scroll: false }
      );
    });

    it('removes empty filter params from URL', () => {
      mockGet.mockImplementation((key: string) => {
        if (key === 'status') return 'DONE';
        return null;
      });
      mockToString.mockReturnValue('tab=pipeline&status=DONE');

      const { result } = renderHook(() => usePipelineFilters());

      act(() => {
        result.current.setFilters({ status: '' });
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.not.stringContaining('status='),
        { scroll: false }
      );
    });

    it('keeps tab=pipeline in URL', () => {
      mockGet.mockReturnValue(null);
      mockToString.mockReturnValue('');

      const { result } = renderHook(() => usePipelineFilters());

      act(() => {
        result.current.setFilters({ status: 'IN_PROGRESS' });
      });

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('tab=pipeline'),
        { scroll: false }
      );
    });
  });

  describe('resetFilters', () => {
    it('resets all filters to empty values (AC-8)', () => {
      mockGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          status: 'REVIEW',
          model: 'sonnet',
          project: 'kira',
          search: 'test',
        };
        return params[key] || null;
      });
      mockToString.mockReturnValue('tab=pipeline&status=REVIEW&model=sonnet&project=kira&search=test');

      const { result } = renderHook(() => usePipelineFilters());

      // Verify initial state
      expect(result.current.filters).toEqual({
        status: 'REVIEW',
        model: 'sonnet',
        project: 'kira',
        search: 'test',
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters).toEqual({
        status: '',
        model: '',
        project: '',
        search: '',
      });
    });

    it('removes all filter params from URL on reset', () => {
      mockGet.mockImplementation((key: string) => {
        const params: Record<string, string> = {
          status: 'REVIEW',
          model: 'sonnet',
        };
        return params[key] || null;
      });
      mockToString.mockReturnValue('tab=pipeline&status=REVIEW&model=sonnet');

      const { result } = renderHook(() => usePipelineFilters());

      act(() => {
        result.current.resetFilters();
      });

      const pushedUrl = mockPush.mock.calls[0][0] as string;
      expect(pushedUrl).not.toContain('status=');
      expect(pushedUrl).not.toContain('model=');
      expect(pushedUrl).not.toContain('project=');
      expect(pushedUrl).not.toContain('search=');
      expect(pushedUrl).toContain('tab=pipeline');
    });
  });

  describe('VALID_STATUSES export', () => {
    it('exports correct valid status values', () => {
      expect(VALID_STATUSES).toEqual(['', 'IN_PROGRESS', 'REVIEW', 'REFACTOR', 'DONE', 'MERGE', 'BLOCKED']);
    });
  });
});
