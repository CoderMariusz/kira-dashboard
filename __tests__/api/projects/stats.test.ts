/**
 * __tests__/api/projects/stats.test.ts
 * STORY-7.4 — Integration tests for GET /api/projects/stats
 *
 * Test matrix:
 *  TC-1  401 — no session (unauthenticated)
 *  TC-2  200 — admin session + mocked sqlite3 response
 *  TC-3  200 — offline mode returns empty projects array
 *  TC-4  200 — handles CLI error gracefully (offline response)
 */

import { jest } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => [],
    set: jest.fn(),
  }),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { GET } from '@/app/api/projects/stats/route';
import { mockAdminSession, mockNoSession } from '@/__tests__/helpers/auth';

function getExecSyncMock(): jest.Mock<any> {
  const mod = jest.requireMock('child_process') as { execSync: jest.Mock<any> };
  return mod.execSync;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/projects/stats', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_BRIDGE_MODE: '' };
    getExecSyncMock().mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ── TC-1: 401 Unauthorized ─────────────────────────────────────────────────

  it('TC-1: returns 401 when user is not authenticated', async () => {
    mockNoSession();

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toMatchObject({ error: expect.stringContaining('autoryz') });
  });

  // ── TC-2: 200 Success with stats ───────────────────────────────────────────

  it('TC-2: returns 200 with project stats for admin', async () => {
    mockAdminSession();

    const mockDbResponse = JSON.stringify([
      {
        key: 'kira-dashboard',
        name: 'Kira Dashboard',
        is_current: 1,
        total: 10,
        done: 5,
        in_progress: 3,
        review: 1,
        blocked: 1,
      },
      {
        key: 'kira',
        name: 'Kira Core',
        is_current: 0,
        total: 20,
        done: 15,
        in_progress: 3,
        review: 2,
        blocked: 0,
      },
    ]);

    getExecSyncMock().mockReturnValue(mockDbResponse);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.projects).toHaveLength(2);
    expect(json.projects[0]).toMatchObject({
      key: 'kira-dashboard',
      name: 'Kira Dashboard',
      is_current: true,
      total: 10,
      done: 5,
      completion_pct: 50,
    });
    expect(json.projects[1]).toMatchObject({
      key: 'kira',
      is_current: false,
      completion_pct: 75,
    });
    expect(json.fetched_at).toBeDefined();
  });

  // ── TC-3: 200 Offline mode ─────────────────────────────────────────────────

  it('TC-3: returns 200 with offline flag when Bridge is offline', async () => {
    mockAdminSession();
    process.env.NEXT_PUBLIC_BRIDGE_MODE = 'offline';

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.projects).toEqual([]);
    expect(json.offline).toBe(true);
    expect(json.fetched_at).toBeDefined();
  });

  // ── TC-4: 200 Graceful error handling ──────────────────────────────────────

  it('TC-4: returns 200 offline response when CLI fails', async () => {
    mockAdminSession();

    getExecSyncMock().mockImplementation(() => {
      throw new Error('sqlite3 not found');
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.projects).toEqual([]);
    expect(json.offline).toBe(true);
  });

  // ── TC-5: 200 Empty database result ────────────────────────────────────────

  it('TC-5: handles empty database result', async () => {
    mockAdminSession();

    getExecSyncMock().mockReturnValue('[]');

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.projects).toEqual([]);
  });

  // ── TC-6: 200 Calculates correct completion percentage ─────────────────────

  it('TC-6: calculates completion percentage correctly', async () => {
    mockAdminSession();

    const mockDbResponse = JSON.stringify([
      {
        key: 'test',
        name: 'Test',
        is_current: 0,
        total: 3,
        done: 1,
        in_progress: 1,
        review: 1,
        blocked: 0,
      },
    ]);

    getExecSyncMock().mockReturnValue(mockDbResponse);

    const res = await GET();
    const json = await res.json();

    expect(json.projects[0].completion_pct).toBe(33.3);
  });

  // ── TC-7: 200 Zero completion when no stories ──────────────────────────────

  it('TC-7: returns 0% completion when total is 0', async () => {
    mockAdminSession();

    const mockDbResponse = JSON.stringify([
      {
        key: 'empty',
        name: 'Empty Project',
        is_current: 0,
        total: 0,
        done: 0,
        in_progress: 0,
        review: 0,
        blocked: 0,
      },
    ]);

    getExecSyncMock().mockReturnValue(mockDbResponse);

    const res = await GET();
    const json = await res.json();

    expect(json.projects[0].completion_pct).toBe(0);
  });
});
