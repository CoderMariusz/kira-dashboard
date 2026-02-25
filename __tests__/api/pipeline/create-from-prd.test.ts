/**
 * __tests__/api/pipeline/create-from-prd.test.ts
 * STORY-7.4 — Integration tests for POST /api/pipeline/create-from-prd
 *
 * Test matrix:
 *  TC-1  401 — no session (unauthenticated)
 *  TC-2  400 — invalid body (missing required fields)
 *  TC-3  400 — invalid project_key format
 *  TC-4  400 — prd_text too short
 *  TC-5  400 — answers not an object
 *  TC-6  503 — offline mode
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

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
  execSync: jest.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '@/app/api/pipeline/create-from-prd/route';
import { mockAdminSession, mockNoSession } from '@/__tests__/helpers/auth';
import { mockRequest } from '@/__tests__/helpers/fetch';

function getAnthropicMock() {
  const mod = jest.requireMock('@anthropic-ai/sdk') as { default: jest.MockedClass<any> };
  return mod.default;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PRD = `
Budujemy aplikację do zarządzania zadaniami dla małych teamów.
Użytkownicy mogą tworzyć projekty, przypisywać zadania i śledzić postęp.
System powinien obsługiwać priorytety, terminy i komentarze.
`.trim();

const VALID_PAYLOAD = {
  prd_text: VALID_PRD,
  project_name: 'Test Project',
  project_key: 'test-project',
  answers: { q1: 'Odpowiedź', q2: 'MVP' },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/pipeline/create-from-prd', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    getAnthropicMock().mockClear();
    process.env = { ...originalEnv, NEXT_PUBLIC_BRIDGE_MODE: '' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ── TC-1: 401 Unauthorized ─────────────────────────────────────────────────

  it('TC-1: returns 401 when user is not authenticated', async () => {
    mockNoSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toMatchObject({ error: expect.stringContaining('autoryz') });
  });

  // ── TC-2: 400 Bad Request (missing fields) ─────────────────────────────────

  it('TC-2: returns 400 when required fields are missing', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  // ── TC-3: 400 Invalid project_key format ───────────────────────────────────

  it('TC-3: returns 400 when project_key has invalid format', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: {
        ...VALID_PAYLOAD,
        project_key: 'Invalid_Key_With_Underscores',
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.toLowerCase()).toContain('klucz');
  });

  // ── TC-4: 400 prd_text too short ───────────────────────────────────────────

  it('TC-4: returns 400 when prd_text is too short', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: {
        ...VALID_PAYLOAD,
        prd_text: 'Too short',
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('50');
  });

  // ── TC-5: 400 answers not an object ────────────────────────────────────────

  it('TC-5: returns 400 when answers is not an object', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: {
        ...VALID_PAYLOAD,
        answers: 'not an object',
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('answers');
  });

  // ── TC-6: 503 Offline mode ─────────────────────────────────────────────────

  it('TC-6: returns 503 when Bridge is in offline mode', async () => {
    mockAdminSession();
    process.env.NEXT_PUBLIC_BRIDGE_MODE = 'offline';

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error.toLowerCase()).toContain('niedostępne');
  });
});
