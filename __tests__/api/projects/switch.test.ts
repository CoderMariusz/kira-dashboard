/**
 * __tests__/api/projects/switch.test.ts
 * STORY-7.4 — Integration tests for POST /api/projects/switch
 *
 * Test matrix:
 *  TC-1  401 — no session (unauthenticated)
 *  TC-2  400 — missing project_key
 *  TC-3  400 — invalid project_key format
 *  TC-4  404 — project not found
 *  TC-5  503 — offline mode
 *  TC-6  200 — admin session + valid project_key
 *  TC-7  503 — CLI error (Bridge unavailable)
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

import { POST } from '@/app/api/projects/switch/route';
import { mockAdminSession, mockNoSession } from '@/__tests__/helpers/auth';
import { mockRequest } from '@/__tests__/helpers/fetch';

function getExecSyncMock(): jest.Mock<any> {
  const mod = jest.requireMock('child_process') as { execSync: jest.Mock<any> };
  return mod.execSync;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/projects/switch', () => {
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

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/projects/switch',
      body: { project_key: 'test-project' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toMatchObject({ error: expect.stringContaining('autoryz') });
  });

  // ── TC-2: 400 Missing project_key ──────────────────────────────────────────

  it('TC-2: returns 400 when project_key is missing', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/projects/switch',
      body: {},
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('project_key');
  });

  // ── TC-3: 400 Invalid project_key format ───────────────────────────────────

  it('TC-3: returns 400 when project_key has invalid format', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/projects/switch',
      body: { project_key: 'Invalid_Key_123' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
  });

  // ── TC-4: 404 Project not found ────────────────────────────────────────────

  it('TC-4: returns 404 when project does not exist', async () => {
    mockAdminSession();

    getExecSyncMock().mockReturnValue('0');

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/projects/switch',
      body: { project_key: 'non-existent-project' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain('nie istnieje');
  });

  // ── TC-5: 503 Offline mode ─────────────────────────────────────────────────

  it('TC-5: returns 503 when Bridge is in offline mode', async () => {
    mockAdminSession();
    process.env.NEXT_PUBLIC_BRIDGE_MODE = 'offline';

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/projects/switch',
      body: { project_key: 'test-project' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toContain('offline');
  });

  // ── TC-6: 200 Success ──────────────────────────────────────────────────────

  it('TC-6: returns 200 on successful project switch', async () => {
    mockAdminSession();

    getExecSyncMock()
      .mockReturnValueOnce('1')
      .mockReturnValueOnce('');

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/projects/switch',
      body: { project_key: 'test-project' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.project_key).toBe('test-project');
    expect(json.switched_at).toBeDefined();
  });

  // ── TC-7: 503 CLI error ────────────────────────────────────────────────────

  it('TC-7: returns 503 when CLI throws error', async () => {
    mockAdminSession();

    getExecSyncMock().mockImplementation(() => {
      throw new Error('Database locked');
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/projects/switch',
      body: { project_key: 'test-project' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toContain('niedostępny');
  });

  // ── TC-8: 400 Invalid JSON body ────────────────────────────────────────────

  it('TC-8: returns 400 when request body is invalid JSON', async () => {
    mockAdminSession();

    const req = new Request('http://localhost/api/projects/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
  });
});
