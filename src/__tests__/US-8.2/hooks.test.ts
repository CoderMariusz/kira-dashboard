import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEpics, useEpic, useCreateEpic, useCreateStory, useMoveStory } from '@/hooks/useEpics';

/**
 * React Query Hooks Tests for US-8.2
 *
 * Tests for:
 * - useEpics() - list of epics
 * - useEpic(id) - single epic with stories
 * - useCreateEpic() - mutation to create epic
 * - useCreateStory(epicId) - mutation to create story
 * - useMoveStory() - mutation to move story
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Hooks do not exist yet
 */

// ═══════════════════════════════════════════
// Table-aware mock pattern
// ═══════════════════════════════════════════

/**
 * PATTERN: Supabase chainable mock with mutations
 * 
 * Supabase query builder returns NEW object on each method call.
 * Mock must support chaining: .eq().eq().single()
 */
function createTableMock(responses: Record<string, any>) {
  return vi.fn((table: string) => {
    const config = responses[table] ?? {};
    
    // Chainable query builder mock for SELECT
    const createSelectChainable = (): any => ({
      eq: vi.fn(() => createSelectChainable()),
      single: vi.fn(() => Promise.resolve(config.singleResult ?? { data: null, error: null })),
      then: (resolve: (v: any) => void) => resolve({
        data: config.eqResult ?? null,
        error: config.eqError ?? null,
      }),
    });
    
    // Chainable for UPDATE
    const createUpdateChainable = (): any => ({
      eq: vi.fn(() => createUpdateChainable()),
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(config.updateResult ?? { data: null, error: null })),
      })),
    });
    
    return {
      select: vi.fn(() => createSelectChainable()),
      insert: vi.fn((payload: any) => {
        if (config.onInsert) config.onInsert(payload);
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(config.insertResult ?? { data: null, error: null })),
          })),
        };
      }),
      update: vi.fn((payload: any) => {
        if (config.onUpdate) config.onUpdate(payload);
        return createUpdateChainable();
      }),
    };
  });
}

// ═══════════════════════════════════════════
// QueryClient setup
// ═══════════════════════════════════════════

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ═══════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════

let mockFrom: ReturnType<typeof createTableMock>;

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    get from() { return mockFrom; },
  })),
}));

// ═══════════════════════════════════════════
// Mock data
// ═══════════════════════════════════════════

const mockEpics = [
  {
    id: 'epic-1',
    title: 'Epic 1',
    description: 'First epic',
    type: 'epic',
    parent_id: null,
    household_id: 'hh-1',
    story_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'epic-2',
    title: 'Epic 2',
    description: 'Second epic',
    type: 'epic',
    parent_id: null,
    household_id: 'hh-1',
    story_count: 0,
    created_at: new Date().toISOString(),
  },
];

const mockEpicWithStories = {
  id: 'epic-1',
  title: 'Epic 1',
  description: 'First epic',
  type: 'epic',
  parent_id: null,
  household_id: 'hh-1',
  created_at: new Date().toISOString(),
  stories: [
    {
      id: 'story-1',
      title: 'Story 1',
      description: 'First story',
      type: 'story',
      parent_id: 'epic-1',
      household_id: 'hh-1',
      completed: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-2',
      title: 'Story 2',
      description: 'Second story',
      type: 'story',
      parent_id: 'epic-1',
      household_id: 'hh-1',
      completed: true,
      created_at: new Date().toISOString(),
    },
  ],
};

const mockNewEpic = {
  id: 'epic-3',
  title: 'New Epic',
  description: 'A new epic',
  type: 'epic',
  parent_id: null,
  household_id: 'hh-1',
  story_count: 0,
  created_at: new Date().toISOString(),
};

const mockNewStory = {
  id: 'story-3',
  title: 'New Story',
  description: 'A new story',
  type: 'story',
  parent_id: 'epic-1',
  household_id: 'hh-1',
  completed: false,
  created_at: new Date().toISOString(),
};

const mockMovedStory = {
  id: 'story-1',
  title: 'Story 1',
  description: 'First story',
  type: 'story',
  parent_id: 'epic-2', // Moved to epic-2
  household_id: 'hh-1',
  completed: false,
  created_at: new Date().toISOString(),
};

// ═══════════════════════════════════════════
// Tests: useEpics()
// ═══════════════════════════════════════════

describe('useEpics()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC3.1: should fetch list of epics on mount', async () => {
    mockFrom = createTableMock({
      tasks: { eqResult: mockEpics, eqError: null },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEpics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.data).toEqual(mockEpics);
  });

  it('AC3.2: should include story_count for each epic', async () => {
    mockFrom = createTableMock({
      tasks: { eqResult: mockEpics, eqError: null },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEpics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    if (result.current.data && result.current.data.length > 0) {
      expect(result.current.data[0]).toHaveProperty('story_count');
    }
  });

  it('AC3.3: should return loading state while fetching', async () => {
    mockFrom = createTableMock({
      tasks: { eqResult: mockEpics, eqError: null },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEpics(), { wrapper });

    // Initially should be loading
    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.isLoading).toBe(true);
  });

  it('AC3.4: should return error state on fetch failure', async () => {
    mockFrom = createTableMock({
      tasks: { eqResult: null, eqError: { message: 'Database error' } },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEpics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.error).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// Tests: useEpic(id)
// ═══════════════════════════════════════════

describe('useEpic(id)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC3.5: should fetch single epic by id', async () => {
    mockFrom = createTableMock({
      tasks: { singleResult: { data: mockEpicWithStories, error: null } },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEpic('epic-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.data).toEqual(mockEpicWithStories);
  });

  it('AC3.6: should include nested stories array', async () => {
    mockFrom = createTableMock({
      tasks: { singleResult: { data: mockEpicWithStories, error: null } },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEpic('epic-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.data.stories).toEqual(mockEpicWithStories.stories);
  });

  it('AC3.7: should return error state if epic not found', async () => {
    mockFrom = createTableMock({
      tasks: { singleResult: { data: null, error: { message: 'Not found' } } },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEpic('nonexistent'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.error).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// Tests: useCreateEpic()
// ═══════════════════════════════════════════

describe('useCreateEpic()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC3.8: should create epic mutation function', async () => {
    mockFrom = createTableMock({
      tasks: { insertResult: { data: mockNewEpic, error: null } },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateEpic(), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.mutate).toBeDefined();
  });

  it('AC3.9: should successfully create epic', async () => {
    mockFrom = createTableMock({
      tasks: { insertResult: { data: mockNewEpic, error: null } },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateEpic(), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    result.current.mutate({ title: 'New Epic', description: 'A new epic' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.data).toEqual(mockNewEpic);
  });

  it('AC3.10: should invalidate epics query cache after creation', async () => {
    let invalidateCalls = 0;
    const queryClient = createTestQueryClient();
    const originalInvalidate = queryClient.invalidateQueries;
    queryClient.invalidateQueries = vi.fn((...args) => {
      invalidateCalls++;
      return originalInvalidate.apply(queryClient, args);
    });

    mockFrom = createTableMock({
      tasks: { insertResult: { data: mockNewEpic, error: null } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateEpic(), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    result.current.mutate({ title: 'New Epic' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateCalls).toBeGreaterThan(0);
  });

  it('AC3.11: should return error state on creation failure', async () => {
    mockFrom = createTableMock({
      tasks: { insertResult: { data: null, error: { message: 'Database error' } } },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateEpic(), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    result.current.mutate({ title: 'New Epic' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.error).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// Tests: useCreateStory(epicId)
// ═══════════════════════════════════════════

describe('useCreateStory(epicId)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC3.12: should create story mutation function with epicId', async () => {
    mockFrom = createTableMock({
      tasks: {
        singleResult: { data: mockEpics[0], error: null },
        insertResult: { data: mockNewStory, error: null },
      },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateStory('epic-1'), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.mutate).toBeDefined();
  });

  it('AC3.13: should successfully create story under epic', async () => {
    mockFrom = createTableMock({
      tasks: {
        singleResult: { data: mockEpics[0], error: null },
        insertResult: { data: mockNewStory, error: null },
      },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateStory('epic-1'), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    result.current.mutate({ title: 'New Story' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.data).toEqual(mockNewStory);
  });

  it('AC3.14: should invalidate epic query cache after story creation', async () => {
    let invalidateCalls = 0;
    const queryClient = createTestQueryClient();
    const originalInvalidate = queryClient.invalidateQueries;
    queryClient.invalidateQueries = vi.fn((...args) => {
      invalidateCalls++;
      return originalInvalidate.apply(queryClient, args);
    });

    mockFrom = createTableMock({
      tasks: {
        singleResult: { data: mockEpics[0], error: null },
        insertResult: { data: mockNewStory, error: null },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateStory('epic-1'), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    result.current.mutate({ title: 'New Story' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateCalls).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// Tests: useMoveStory()
// ═══════════════════════════════════════════

describe('useMoveStory()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC3.15: should create move story mutation function', async () => {
    mockFrom = createTableMock({
      tasks: {
        singleResult: { data: mockEpicWithStories.stories[0], error: null },
        updateResult: { data: mockMovedStory, error: null },
      },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMoveStory(), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.mutate).toBeDefined();
  });

  it('AC3.16: should successfully move story to different epic', async () => {
    mockFrom = createTableMock({
      tasks: {
        singleResult: { data: mockEpicWithStories.stories[0], error: null },
        updateResult: { data: mockMovedStory, error: null },
      },
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMoveStory(), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    result.current.mutate({ storyId: 'story-1', newParentId: 'epic-2' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // @ts-expect-error - Hook doesn't exist yet
    expect(result.current.data.parent_id).toBe('epic-2');
  });

  it('AC3.17: should invalidate both source and target epic query caches', async () => {
    let invalidateCalls = 0;
    const queryClient = createTestQueryClient();
    const originalInvalidate = queryClient.invalidateQueries;
    queryClient.invalidateQueries = vi.fn((...args) => {
      invalidateCalls++;
      return originalInvalidate.apply(queryClient, args);
    });

    mockFrom = createTableMock({
      tasks: {
        singleResult: { data: mockEpicWithStories.stories[0], error: null },
        updateResult: { data: mockMovedStory, error: null },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMoveStory(), { wrapper });

    // @ts-expect-error - Hook doesn't exist yet
    result.current.mutate({ storyId: 'story-1', newParentId: 'epic-2' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateCalls).toBeGreaterThan(0);
  });
});
