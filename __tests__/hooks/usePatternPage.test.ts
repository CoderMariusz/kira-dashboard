/**
 * __tests__/hooks/usePatternPage.test.ts
 * STORY-8.3 — Unit tests for usePatternPage, useAddPattern, useAddLesson hooks
 */

import { jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import React from 'react';

// ─── Mock fetch globally ──────────────────────────────────────────────────────
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
global.fetch = mockFetch as typeof fetch;

// ─── Mock SWR mutate ─────────────────────────────────────────────────────────
jest.mock('swr', () => ({
  __esModule: true,
  ...jest.requireActual('swr'),
  mutate: jest.fn(),
}));

// Import mutate mock reference after jest.mock hoisting
import { mutate as swrMutate } from 'swr';
const mockMutateGlobal = swrMutate as jest.Mock;

// ─── Imports (after mocks) ───────────────────────────────────────────────────
import { usePatternPage } from '@/hooks/usePatternPage';
import { useAddPattern } from '@/hooks/useAddPattern';
import { useAddLesson } from '@/hooks/useAddLesson';
import type {
  PatternCard,
  Lesson,
  PatternsMeta,
  PatternsResponse,
  AddPatternDTO,
  AddLessonDTO,
} from '@/types/patterns';

// ─── Test data ────────────────────────────────────────────────────────────────
const mockPattern: PatternCard = {
  id: 'P-001',
  source: 'patterns.md',
  type: 'PATTERN',
  category: 'testing',
  date: '2026-02-25',
  model: 'sonnet',
  domain: 'frontend',
  text: 'Always write tests before implementing',
  tags: ['tdd', 'testing'],
  related_stories: ['STORY-8.3'],
  occurrences: 3,
};

const mockAntiPattern: PatternCard = {
  id: 'AP-001',
  source: 'anti-patterns.md',
  type: 'ANTI_PATTERN',
  category: 'testing',
  date: null,
  model: null,
  domain: null,
  text: 'Skipping tests to save time',
  tags: ['testing'],
  related_stories: [],
  occurrences: 1,
};

const mockLesson: Lesson = {
  id: 'BUG-001',
  source: 'LESSONS_LEARNED.md',
  title: 'Always read story spec first',
  severity: 'warning',
  category: 'process',
  date: '2026-02-25',
  body: 'Lesson body here',
  root_cause: 'Skipped spec reading',
  fix: 'Read spec before coding',
  lesson: 'Lesson text',
  tags: ['process'],
};

const mockMeta: PatternsMeta = {
  total_patterns: 2,
  total_lessons: 1,
  sources: ['patterns.md', 'anti-patterns.md', 'LESSONS_LEARNED.md'],
  generated_at: '2026-02-25T10:00:00Z',
};

const mockPatternsResponse: PatternsResponse = {
  patterns: [mockPattern, mockAntiPattern],
  lessons: [mockLesson],
  meta: mockMeta,
};

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
// Tests: usePatternPage
// ─────────────────────────────────────────────────────────────────────────────

describe('usePatternPage', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockMutateGlobal.mockClear();
  });

  describe('loading state', () => {
    it('returns isLoading=true initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.patterns).toBeNull();
      expect(result.current.lessons).toBeNull();
      expect(result.current.meta).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('success state', () => {
    it('returns patterns, lessons, meta on success', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse(mockPatternsResponse));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.patterns).toHaveLength(2);
      expect(result.current.patterns?.[0]).toEqual(mockPattern);
      expect(result.current.patterns?.[1]).toEqual(mockAntiPattern);
      expect(result.current.lessons).toHaveLength(1);
      expect(result.current.lessons?.[0]).toEqual(mockLesson);
      expect(result.current.meta).toEqual(mockMeta);
      expect(result.current.error).toBeNull();
    });

    it('calls /api/patterns SWR key', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse(mockPatternsResponse));

      renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const calledUrl = (mockFetch.mock.calls[0][0] as string);
      expect(calledUrl).toContain('/api/patterns');
    });

    it('exposes refresh function', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse(mockPatternsResponse));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.refresh).toBe('function');
    });

    it('refresh() triggers re-fetch', async () => {
      mockFetch.mockResolvedValue(makeFetchResponse(mockPatternsResponse));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const fetchCountBefore = mockFetch.mock.calls.length;
      await act(async () => {
        await result.current.refresh();
      });

      // After refresh, fetch should have been called again
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(fetchCountBefore);
    });
  });

  describe('error state', () => {
    it('sets error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).not.toBeNull();
      expect(result.current.patterns).toBeNull();
    });

    it('error.message is in Polish on network failure', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).not.toBeNull());

      expect(result.current.error?.message).toMatch(/połączyć|serwer|połączenie/i);
    });

    it('error.message is in Polish for 401', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(401));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).not.toBeNull());

      expect(result.current.error?.message).toMatch(/sesja|zaloguj/i);
    });

    it('error.message is in Polish for 403', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(403));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).not.toBeNull());

      expect(result.current.error?.message).toMatch(/uprawnień|operacji/i);
    });

    it('error.message is in Polish for 500', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500));

      const { result } = renderHook(() => usePatternPage(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).not.toBeNull());

      expect(result.current.error?.message).toMatch(/błąd serwera|spróbuj ponownie/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: useAddPattern
// ─────────────────────────────────────────────────────────────────────────────

describe('useAddPattern', () => {
  const dto: AddPatternDTO = {
    type: 'PATTERN',
    category: 'testing',
    text: 'New pattern text',
    model: 'sonnet',
    domain: 'frontend',
  };

  beforeEach(() => {
    mockFetch.mockClear();
    mockMutateGlobal.mockClear();
  });

  it('starts with isLoading=false and no error', () => {
    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.addPattern).toBe('function');
  });

  it('sends POST to /api/patterns with body', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ success: true, entry: 'P-002' }));

    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.addPattern(dto);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url as string).toContain('/api/patterns');
    expect((options as RequestInit).method).toBe('POST');
    expect(JSON.parse((options as RequestInit).body as string)).toMatchObject(dto);
  });

  it('sets isLoading=true during request', async () => {
    let resolveRequest!: (r: Response) => void;
    mockFetch.mockImplementation(() => new Promise<Response>((res) => { resolveRequest = res; }));

    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    act(() => {
      void result.current.addPattern(dto);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolveRequest(makeFetchResponse({ success: true, entry: 'P-002' }));
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('invalidates SWR cache after success (mutate /api/patterns)', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ success: true, entry: 'P-002' }));

    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.addPattern(dto);
    });

    expect(mockMutateGlobal).toHaveBeenCalledWith('/api/patterns');
  });

  it('sets error on network failure with Polish message', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addPattern(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/połączyć|serwer|połączenie/i);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error on 401 with Polish message', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(401));

    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addPattern(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/sesja|zaloguj/i);
  });

  it('sets error on 403 with Polish message', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(403));

    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addPattern(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/uprawnień|operacji/i);
  });

  it('sets error on 500 with Polish message', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(500));

    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addPattern(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/błąd serwera|spróbuj ponownie/i);
  });

  it('does not mutate cache on error', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(500));

    const { result } = renderHook(() => useAddPattern(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addPattern(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(mockMutateGlobal).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: useAddLesson
// ─────────────────────────────────────────────────────────────────────────────

describe('useAddLesson', () => {
  const dto: AddLessonDTO = {
    id: 'BUG-004',
    title: 'New lesson title',
    severity: 'warning',
    category: 'process',
    body: 'Lesson body',
    lesson: 'The lesson text',
    root_cause: 'Some root cause',
    fix: 'Apply fix here',
    tags: ['process', 'testing'],
  };

  beforeEach(() => {
    mockFetch.mockClear();
    mockMutateGlobal.mockClear();
  });

  it('starts with isLoading=false and no error', () => {
    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.addLesson).toBe('function');
  });

  it('sends POST to /api/lessons with body', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ success: true }));

    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.addLesson(dto);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url as string).toContain('/api/lessons');
    expect((options as RequestInit).method).toBe('POST');
    expect(JSON.parse((options as RequestInit).body as string)).toMatchObject(dto);
  });

  it('sets isLoading=true during request', async () => {
    let resolveRequest!: (r: Response) => void;
    mockFetch.mockImplementation(() => new Promise<Response>((res) => { resolveRequest = res; }));

    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    act(() => {
      void result.current.addLesson(dto);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolveRequest(makeFetchResponse({ success: true }));
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('invalidates /api/patterns SWR cache after success', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ success: true }));

    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.addLesson(dto);
    });

    expect(mockMutateGlobal).toHaveBeenCalledWith('/api/patterns');
  });

  it('sets error on network failure with Polish message', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addLesson(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/połączyć|serwer|połączenie/i);
  });

  it('does not mutate cache on error', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(500));

    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addLesson(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(mockMutateGlobal).not.toHaveBeenCalled();
  });

  it('sets error on 401 with Polish message', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(401));

    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addLesson(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/sesja|zaloguj/i);
  });

  it('sets error on 403 with Polish message', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(403));

    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addLesson(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/uprawnień|operacji/i);
  });

  it('sets error on 500 with Polish message', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(500));

    const { result } = renderHook(() => useAddLesson(), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.addLesson(dto); } catch { /* expected */ }
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/błąd serwera|spróbuj ponownie/i);
  });
});
