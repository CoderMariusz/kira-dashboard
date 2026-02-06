import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as POST_EPIC } from '@/app/api/epics/route';
import { POST as POST_STORY } from '@/app/api/epics/[id]/stories/route';
import { DELETE as DELETE_EPIC } from '@/app/api/epics/[id]/route';
import { PUT as PUT_PARENT } from '@/app/api/tasks/[id]/parent/route';
import { NextRequest } from 'next/server';

/**
 * API Mutation Endpoints Tests for US-8.2
 *
 * Tests for:
 * - POST /api/epics - create epic
 * - POST /api/epics/[id]/stories - create story
 * - PUT /api/tasks/[id]/parent - move story
 * - DELETE /api/epics/[id] - delete epic
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * API routes do not exist yet
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
    
    // Chainable for DELETE
    const createDeleteChainable = (): any => ({
      eq: vi.fn(() => createDeleteChainable()),
      then: (resolve: (v: any) => void) => resolve(config.deleteResult ?? { error: null }),
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
      delete: vi.fn(() => createDeleteChainable()),
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

const mockEpic = {
  id: 'epic-1',
  title: 'Test Epic',
  description: 'A test epic',
  type: 'epic',
  parent_id: null,
  household_id: 'hh-1',
  created_at: new Date().toISOString(),
};

const mockStory = {
  id: 'story-1',
  title: 'Test Story',
  description: 'A test story',
  type: 'story',
  parent_id: 'epic-1',
  household_id: 'hh-1',
  completed: false,
  created_at: new Date().toISOString(),
};

// ═══════════════════════════════════════════
// Tests: POST /api/epics
// ═══════════════════════════════════════════

describe('POST /api/epics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC2.1: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/epics', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Epic' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_EPIC(request);

    expect(response.status).toBe(401);
  });

  it('AC2.2: should return 400 if user has no household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: { ...mockProfile, household_id: null }, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Epic' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_EPIC(request);

    expect(response.status).toBe(400);
  });

  it('AC2.3: should validate that title is required', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics', {
      method: 'POST',
      body: JSON.stringify({ description: 'No title' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_EPIC(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('title');
  });

  it('AC2.4: should create epic with type="epic" and parent_id=null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    let capturedInsert: any;
    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        onInsert: (payload: any) => { capturedInsert = payload; },
        insertResult: { data: mockEpic, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Epic', description: 'Description' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_EPIC(request);

    expect(capturedInsert.type).toBe('epic');
    expect(capturedInsert.parent_id).toBeNull();
  });

  it('AC2.5: should set household_id to user\'s household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    let capturedInsert: any;
    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        onInsert: (payload: any) => { capturedInsert = payload; },
        insertResult: { data: mockEpic, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Epic' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_EPIC(request);

    expect(capturedInsert.household_id).toBe('hh-1');
  });

  it('AC2.6: should return created epic object with 200 status', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { insertResult: { data: mockEpic, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Epic' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_EPIC(request);
    const json = await response.json();

    // POST returns 201 Created (RESTful)
    expect(response.status).toBe(201);
    expect(json.epic).toBeDefined();
    expect(json.epic.id).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// Tests: POST /api/epics/[id]/stories
// ═══════════════════════════════════════════

describe('POST /api/epics/[id]/stories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC2.7: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Story' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_STORY(request, { params: { id: 'epic-1' } });

    expect(response.status).toBe(401);
  });

  it('AC2.8: should return 404 if epic does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: null, error: { message: 'Not found' } } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/nonexistent/stories', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Story' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_STORY(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('AC2.9: should return 403 if epic belongs to different household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: {
          data: { ...mockEpic, household_id: 'hh-2' },
          error: null,
        },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Story' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_STORY(request, { params: { id: 'epic-1' } });

    expect(response.status).toBe(404) // Security: 404 not 403;
  });

  it('AC2.10: should validate that title is required', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: mockEpic, error: null } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'POST',
      body: JSON.stringify({ description: 'No title' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_STORY(request, { params: { id: 'epic-1' } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('title');
  });

  it('AC2.11: should create story with type="story" and parent_id=epicId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    let capturedInsert: any;
    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: { data: mockEpic, error: null },
        onInsert: (payload: any) => { capturedInsert = payload; },
        insertResult: { data: mockStory, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Story' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_STORY(request, { params: { id: 'epic-1' } });

    expect(capturedInsert.type).toBe('story');
    expect(capturedInsert.parent_id).toBe('epic-1');
  });

  it('AC2.12: should return created story object with 200 status', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: { data: mockEpic, error: null },
        insertResult: { data: mockStory, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1/stories', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Story' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await POST_STORY(request, { params: { id: 'epic-1' } });
    const json = await response.json();

    // POST returns 201 Created (RESTful)
    expect(response.status).toBe(201);
    expect(json.story).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// Tests: PUT /api/tasks/[id]/parent
// ═══════════════════════════════════════════

describe('PUT /api/tasks/[id]/parent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC2.13: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/tasks/story-1/parent', {
      method: 'PUT',
      body: JSON.stringify({ parent_id: 'epic-2' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await PUT_PARENT(request, { params: { id: 'story-1' } });

    expect(response.status).toBe(401);
  });

  it('AC2.14: should return 404 if story does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: null, error: { message: 'Not found' } } },
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/nonexistent/parent', {
      method: 'PUT',
      body: JSON.stringify({ parent_id: 'epic-2' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await PUT_PARENT(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('AC2.15: should return 403 if story belongs to different household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: {
          data: { ...mockStory, household_id: 'hh-2' },
          error: null,
        },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/story-1/parent', {
      method: 'PUT',
      body: JSON.stringify({ parent_id: 'epic-2' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await PUT_PARENT(request, { params: { id: 'story-1' } });

    expect(response.status).toBe(404) // Security: 404 not 403;
  });

  it('AC2.16: should update parent_id of story', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    let capturedUpdate: any;
    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: { data: mockStory, error: null },
        onUpdate: (payload: any) => { capturedUpdate = payload; },
        updateResult: { data: { ...mockStory, parent_id: 'epic-2' }, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/story-1/parent', {
      method: 'PUT',
      body: JSON.stringify({ parent_id: 'epic-2' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await PUT_PARENT(request, { params: { id: 'story-1' } });

    expect(capturedUpdate.parent_id).toBe('epic-2');
  });

  it('AC2.17: should return 200 with updated story', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: { data: mockStory, error: null },
        updateResult: { data: { ...mockStory, parent_id: 'epic-2' }, error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/tasks/story-1/parent', {
      method: 'PUT',
      body: JSON.stringify({ parent_id: 'epic-2' }),
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await PUT_PARENT(request, { params: { id: 'story-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.story.parent_id).toBe('epic-2');
  });
});

// ═══════════════════════════════════════════
// Tests: DELETE /api/epics/[id]
// ═══════════════════════════════════════════

describe('DELETE /api/epics/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC2.18: should return 401 if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1', {
      method: 'DELETE',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await DELETE_EPIC(request, { params: { id: 'epic-1' } });

    expect(response.status).toBe(401);
  });

  it('AC2.19: should return 404 if epic does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: { singleResult: { data: null, error: { message: 'Not found' } } },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/nonexistent', {
      method: 'DELETE',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await DELETE_EPIC(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('AC2.20: should return 403 if epic belongs to different household', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: {
          data: { ...mockEpic, household_id: 'hh-2' },
          error: null,
        },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1', {
      method: 'DELETE',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await DELETE_EPIC(request, { params: { id: 'epic-1' } });

    expect(response.status).toBe(404) // Security: 404 not 403;
  });

  // CASCADE DELETE is DB-level feature - requires integration test with real Supabase
  // Unit test cannot verify DB cascade behavior
  it.skip('AC2.21: should delete epic and cascade delete all its stories', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    let deletedTasks: string[] = [];
    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: { data: mockEpic, error: null },
        deleteResult: (table: string) => {
          deletedTasks.push(table);
          return Promise.resolve({ error: null });
        },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1', {
      method: 'DELETE',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await DELETE_EPIC(request, { params: { id: 'epic-1' } });

    // Should delete epic and its stories
    expect(deletedTasks.length).toBeGreaterThan(0);
  });

  it('AC2.22: should return 200 on successful deletion', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    mockFrom = createTableMock({
      profiles: { singleResult: { data: mockProfile, error: null } },
      tasks: {
        singleResult: { data: mockEpic, error: null },
        deleteResult: { error: null },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/epics/epic-1', {
      method: 'DELETE',
    });

    // @ts-expect-error - API route doesn't exist yet
    const response = await DELETE_EPIC(request, { params: { id: 'epic-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
