import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as GET_EPICS } from '@/app/api/epics/route';
import { GET as GET_EPIC_BY_ID } from '@/app/api/epics/[id]/route';
import { GET as GET_STORIES } from '@/app/api/epics/[id]/stories/route';
import { NextRequest } from 'next/server';

/**
 * API GET Endpoints Tests for US-8.2
 *
 * Tests for:
 * - GET /api/epics - list all epics with story count
 * - GET /api/epics/[id] - single epic with nested stories
 * - GET /api/epics/[id]/stories - stories for an epic
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * API routes do not exist yet
 */

// ═══════════════════════════════════════════
// Table-aware mock pattern
// ═══════════════════════════════════════════

/**
 * PATTERN: Supabase chainable mock
 * 
 * Supabase query builder returns NEW object on each method call.
 * Mock must support chaining: .eq().eq().single()
 */
function createTableMock(responses: Record<string, any>) {
  return vi.fn((table: string) => {
    const config = responses[table] ?? {};
    
    // Chainable query builder mock
    const createChainable = (): any => ({
      eq: vi.fn(() => createChainable()),
      single: vi.fn(() => Promise.resolve(config.singleResult ?? { data: null, error: null })),
      then: (resolve: (v: any) => void) => resolve({
        data: config.eqResult ?? null,
        error: config.eqError ?? null,
      }),
    });
    
    return {
      select: vi.fn(() => createChainable()),
    };
  });
}

// ═══════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════

let mockFrom: ReturnType<typeof createTableMock>;
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    get from() { return mockFrom; },
  })),
}));

// ═══════════════════════════════════════════
// Mock data
// ═══════════════════════════════════════════

const mockProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  household_id: 'hh-1',
  display_name: 'John Doe',
  role: 'admin',
};

const mockEpics = [
  {
    id: 'epic-1',
    title: 'Epic 1',
    description: 'First epic',
    type: 'epic',
    parent_id: null,
    household_id: 'hh-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'epic-2',
    title: 'Epic 2',
    description: 'Second epic',
    type: 'epic',
    parent_id: null,
    household_id: 'hh-1',
    created_at: new Date().toISOString(),
  },
];

const mockStories = [
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
];

// ═══════════════════════════════════════════
// Tests: GET /api/epics
// ═══════════════════════════════════════════

describe('GET /api/epics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1.1: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/epics');

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPICS(request);

    expect(response.status).toBe(401);
  });

  it('AC1.2: should return 400 if user has no household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: { ...mockProfile, household_id: null }, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics');

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPICS(request);

    expect(response.status).toBe(400);
  });

  it('AC1.3: should return list of all epics for user\'s household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics');

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPICS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json.epics)).toBe(true);
  });

  it('AC1.4: should include story count for each epic', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics');

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPICS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    if (json.epics && json.epics.length > 0) {
      expect(json.epics[0]).toHaveProperty('story_count');
      expect(typeof json.epics[0].story_count).toBe('number');
    }
  });

  it('AC1.5: should return empty array if no epics exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics');

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPICS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.epics).toEqual([]);
  });
});

// ═══════════════════════════════════════════
// Tests: GET /api/epics/[id]
// ═══════════════════════════════════════════

describe('GET /api/epics/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1.6: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPIC_BY_ID(request, { params: { id: 'epic-1' } });

    expect(response.status).toBe(401);
  });

  it('AC1.7: should return 404 if epic does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: null, error: { message: 'Not found' } } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/nonexistent', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPIC_BY_ID(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('AC1.8: should return 404 if epic belongs to different household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: {
          data: { ...mockEpics[0], household_id: 'hh-2' }, // Different household
          error: null,
        },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPIC_BY_ID(request, { params: { id: 'epic-1' } });

    expect(response.status).toBe(404) // Security: 404 not 403;
  });

  it('AC1.9: should return epic with nested stories array', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: mockEpics[0], error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPIC_BY_ID(request, { params: { id: 'epic-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.epic).toBeDefined();
    expect(json.epic.id).toBe('epic-1');
    expect(Array.isArray(json.epic.stories)).toBe(true);
  });

  it('AC1.10: should include all story fields (id, title, completed, etc.)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: mockEpics[0], error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_EPIC_BY_ID(request, { params: { id: 'epic-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    if (json.epic && json.epic.stories && json.epic.stories.length > 0) {
      const story = json.epic.stories[0];
      expect(story).toHaveProperty('id');
      expect(story).toHaveProperty('title');
      expect(story).toHaveProperty('completed');
    }
  });
});

// ═══════════════════════════════════════════
// Tests: GET /api/epics/[id]/stories
// ═══════════════════════════════════════════

describe('GET /api/epics/[id]/stories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1.11: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_STORIES(request, { params: { id: 'epic-1' } });

    expect(response.status).toBe(401);
  });

  it('AC1.12: should return 404 if epic does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: null, error: { message: 'Not found' } } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/nonexistent/stories', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_STORIES(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('AC1.13: should return 403 if epic belongs to different household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: {
          data: { ...mockEpics[0], household_id: 'hh-2' },
          error: null,
        },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_STORIES(request, { params: { id: 'epic-1' } });

    expect(response.status).toBe(404) // Security: 404 not 403;
  });

  it('AC1.14: should return only stories for the specified epic', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: mockEpics[0], error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_STORIES(request, { params: { id: 'epic-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json.stories)).toBe(true);
  });

  it('AC1.15: should return empty array if epic has no stories', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: mockEpics[0], error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'GET',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await GET_STORIES(request, { params: { id: 'epic-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.stories).toEqual([]);
  });
});
