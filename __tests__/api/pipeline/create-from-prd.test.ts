/**
 * __tests__/api/pipeline/create-from-prd.test.ts
 * STORY-7.4 / STORY-14.4 — Integration tests for POST /api/pipeline/create-from-prd
 *
 * Test matrix:
 *  TC-1  401 — no session (unauthenticated)
 *  TC-2  400 — invalid body (missing required fields)
 *  TC-3  400 — invalid project_key format
 *  TC-4  400 — prd_text too short
 *  TC-5  400 — answers not an object
 *  TC-6  503 — offline mode
 *  TC-7  400 — prd_text too long (> 20000)
 *  TC-8  400 — project_name too short (< 2)
 *  TC-9  400 — project_name too long (> 100)
 *  TC-10 400 — project_key too short (< 3)
 *  TC-11 400 — answers values not strings
 *  TC-12 503 — Anthropic API error
 *  TC-13 422 — AI returns non-text block
 *  TC-14 422 — AI returns invalid JSON
 *  TC-15 422 — AI returns empty epics array
 *  TC-16 422 — AI returns invalid epic structure
 *  TC-17 200 — Full success with Bridge CLI
 *  TC-18 409 — Bridge project already exists
 *  TC-19 500 — Bridge CLI error (other)
 *  TC-20 200 — Bridge plan-epic errors handled gracefully
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

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '@/app/api/pipeline/create-from-prd/route';
import { mockAdminSession, mockNoSession } from '@/__tests__/helpers/auth';
import { mockRequest } from '@/__tests__/helpers/fetch';

function getAnthropicMock() {
  const mod = jest.requireMock('@anthropic-ai/sdk') as { default: jest.MockedClass<any> };
  return mod.default;
}

function getExecMock(): jest.Mock {
  const mod = jest.requireMock('child_process') as { exec: jest.Mock };
  return mod.exec;
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

  // ── TC-7: 400 prd_text too long (> 20000) ──────────────────────────────────

  it('TC-7: returns 400 when prd_text exceeds 20000 characters', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: {
        ...VALID_PAYLOAD,
        prd_text: 'A'.repeat(20001),
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('20 000');
  });

  // ── TC-8: 400 project_name too short (< 2 chars) ───────────────────────────

  it('TC-8: returns 400 when project_name is too short', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: {
        ...VALID_PAYLOAD,
        project_name: 'A',
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.toLowerCase()).toContain('nazwa');
  });

  // ── TC-9: 400 project_name too long (> 100 chars) ──────────────────────────

  it('TC-9: returns 400 when project_name is too long', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: {
        ...VALID_PAYLOAD,
        project_name: 'A'.repeat(101),
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.toLowerCase()).toContain('nazwa');
  });

  // ── TC-10: 400 project_key too short (< 3 chars) ───────────────────────────

  it('TC-10: returns 400 when project_key is too short', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: {
        ...VALID_PAYLOAD,
        project_key: 'ab',
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.toLowerCase()).toContain('klucz');
  });

  // ── TC-11: 400 answers values not strings ──────────────────────────────────

  it('TC-11: returns 400 when answers contains non-string values', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: {
        ...VALID_PAYLOAD,
        answers: { q1: 123, q2: true },
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.toLowerCase()).toContain('answers');
  });

  // ── TC-12: 503 Anthropic API error ─────────────────────────────────────────

  it('TC-12: returns 503 when Anthropic API fails', async () => {
    mockAdminSession();

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockRejectedValue(new Error('API Error')),
      },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error.toLowerCase()).toContain('niedostępny');
  });

  // ── TC-13: 422 AI returns non-text block ───────────────────────────────────

  it('TC-13: returns 422 when AI returns non-text content block', async () => {
    mockAdminSession();

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'image' }],
        }),
      },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('nie zdołało');
  });

  // ── TC-14: 422 AI returns invalid JSON ─────────────────────────────────────

  it('TC-14: returns 422 when AI returns invalid JSON', async () => {
    mockAdminSession();

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'not valid json' }],
        }),
      },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('nie zdołało');
  });

  // ── TC-15: 422 AI returns empty epics array ────────────────────────────────

  it('TC-15: returns 422 when AI returns empty epics array', async () => {
    mockAdminSession();

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify({ epics: [] }) }],
        }),
      },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('nie zdołało');
  });

  // ── TC-16: 422 AI returns invalid epic structure ───────────────────────────

  it('TC-16: returns 422 when AI returns epics with invalid structure', async () => {
    mockAdminSession();

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: JSON.stringify({
              epics: [{
                epic_id: 'EPIC-1',
                title: 'Test Epic',
                stories: [{ id: 'STORY-1.1' }] // missing required fields
              }]
            }),
          }],
        }),
      },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('nie zdołało');
  });

  // ── TC-17: 200 Full success with Bridge CLI ────────────────────────────────

  it('TC-17: returns 200 with project data on full success', async () => {
    mockAdminSession();

    const validAiResponse = {
      epics: [{
        epic_id: 'EPIC-1',
        title: 'Test Epic',
        stories: [{
          id: 'STORY-1.1',
          title: 'Test Story',
          domain: 'backend',
          size: 'short',
          dod: 'Test DoD'
        }]
      }]
    };

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(validAiResponse) }],
        }),
      },
    }));

    // Mock successful Bridge CLI execution
    getExecMock().mockImplementation((cmd: string, opts: unknown, callback?: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      if (callback) {
        callback(null, { stdout: 'Success', stderr: '' });
      }
      // Return mock child process
      return { stdout: '', stderr: '' } as any;
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      project_key: 'test-project',
      epics_count: 1,
      stories_count: 1,
    });
    expect(json.bridge_output).toBeTruthy();
  });

  // ── TC-18: 409 Bridge project already exists ───────────────────────────────

  it('TC-18: returns 409 when project already exists in Bridge', async () => {
    mockAdminSession();

    const validAiResponse = {
      epics: [{
        epic_id: 'EPIC-1',
        title: 'Test Epic',
        stories: [{
          id: 'STORY-1.1',
          title: 'Test Story',
          domain: 'backend',
          size: 'short',
          dod: 'Test DoD'
        }]
      }]
    };

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(validAiResponse) }],
        }),
      },
    }));

    // Mock Bridge CLI error with "already exists"
    const execError = new Error('Command failed') as Error & { stdout?: string; stderr?: string };
    execError.stdout = '';
    execError.stderr = 'Project already exists';

    getExecMock().mockImplementation((cmd: string, opts: unknown, callback?: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      if (callback) {
        callback(execError, { stdout: '', stderr: 'Project already exists' });
      }
      return { stdout: '', stderr: '' } as any;
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.toLowerCase()).toContain('już istnieje');
  });

  // ── TC-19: 500 Bridge CLI error (other) ────────────────────────────────────

  it('TC-19: returns 500 when Bridge CLI fails with other error', async () => {
    mockAdminSession();

    const validAiResponse = {
      epics: [{
        epic_id: 'EPIC-1',
        title: 'Test Epic',
        stories: [{
          id: 'STORY-1.1',
          title: 'Test Story',
          domain: 'backend',
          size: 'short',
          dod: 'Test DoD'
        }]
      }]
    };

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(validAiResponse) }],
        }),
      },
    }));

    // Mock Bridge CLI error with generic error
    const execError = new Error('Command failed') as Error & { stdout?: string; stderr?: string };
    execError.stdout = '';
    execError.stderr = 'Some other error';

    getExecMock().mockImplementation((cmd: string, opts: unknown, callback?: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      if (callback) {
        callback(execError, { stdout: '', stderr: 'Some other error' });
      }
      return { stdout: '', stderr: '' } as any;
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.toLowerCase()).toContain('błąd serwera');
  });

  // ── TC-20: 200 Bridge plan-epic errors handled gracefully ──────────────────

  it('TC-20: returns 200 even when plan-epic fails for some epics', async () => {
    mockAdminSession();

    const validAiResponse = {
      epics: [
        {
          epic_id: 'EPIC-1',
          title: 'Test Epic 1',
          stories: [{
            id: 'STORY-1.1',
            title: 'Test Story',
            domain: 'backend',
            size: 'short',
            dod: 'Test DoD'
          }]
        },
        {
          epic_id: 'EPIC-2',
          title: 'Test Epic 2',
          stories: [{
            id: 'STORY-2.1',
            title: 'Test Story 2',
            domain: 'frontend',
            size: 'medium',
            dod: 'Test DoD 2'
          }]
        }
      ]
    };

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(validAiResponse) }],
        }),
      },
    }));

    // Mock Bridge CLI - first call succeeds, second fails
    let callCount = 0;
    getExecMock().mockImplementation((cmd: string, opts: unknown, callback?: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      callCount++;
      if (callback) {
        if (cmd.includes('projects add')) {
          callback(null, { stdout: 'Project added', stderr: '' });
        } else if (cmd.includes('plan-epic')) {
          if (callCount === 2) {
            callback(null, { stdout: 'Epic planned', stderr: '' });
          } else {
            const execError = new Error('Plan failed') as Error & { stdout?: string; stderr?: string };
            callback(execError, { stdout: '', stderr: 'Plan failed' });
          }
        } else {
          callback(null, { stdout: 'OK', stderr: '' });
        }
      }
      return { stdout: '', stderr: '' } as any;
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/create-from-prd',
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.epics_count).toBe(2);
    expect(json.bridge_output).toContain('ERROR');
  });
});
