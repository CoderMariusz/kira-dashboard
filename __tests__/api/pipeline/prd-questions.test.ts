/**
 * __tests__/api/pipeline/prd-questions.test.ts
 * STORY-7.2 — Integration tests for POST /api/pipeline/prd-questions
 *
 * Test matrix:
 *  TC-1  401 — no session (unauthenticated)
 *  TC-2  400 — admin session but prd_text too short (<50 chars)
 *  TC-3  200 — admin session + valid prd_text + mocked Anthropic response
 */

import { jest } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Mock Supabase server client — controlled per-test via helpers
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock next/headers (cookies) — required by createClient even when mocked above
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => [],
    set: jest.fn(),
  } as any),
}));

// Mock Anthropic SDK.
// The factory is self-contained (no external variable references) to avoid
// ESM hoisting issues. We access the create mock via jest.requireMock() later.
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '@/app/api/pipeline/prd-questions/route';
import { mockAdminSession, mockNoSession } from '@/__tests__/helpers/auth';
import { mockRequest } from '@/__tests__/helpers/fetch';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the `messages.create` mock from the currently-instantiated
 * Anthropic mock. Must be called AFTER POST() so that `new Anthropic()`
 * has been called inside the route handler.
 *
 * For TC-3 we call it BEFORE POST by calling it inside the mockImplementation.
 */
function getAnthropicMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = jest.requireMock('@anthropic-ai/sdk') as { default: jest.MockedClass<any> };
  return mod.default;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PRD = `
Budujemy aplikację do zarządzania zadaniami dla małych teamów.
Użytkownicy mogą tworzyć projekty, przypisywać zadania i śledzić postęp.
System powinien obsługiwać priorytety, terminy i komentarze.
Integracja z kalendarzem i powiadomieniami e-mail jest wymagana.
`.trim(); // well over 50 characters

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/pipeline/prd-questions', () => {
  beforeEach(() => {
    // Reset instance tracking between tests so mock.results stays clean
    getAnthropicMock().mockClear();
  });

  // ── TC-1: 401 Unauthorized (no session) ────────────────────────────────────

  it('TC-1: returns 401 when user is not authenticated', async () => {
    mockNoSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toMatchObject({ error: expect.stringContaining('autoryz') });
  });

  // ── TC-2: 400 Bad Request (prd_text too short) ─────────────────────────────

  it('TC-2: returns 400 when prd_text is shorter than 50 characters', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: 'Za krótkie PRD' }, // << 50 chars
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toMatchObject({ error: expect.stringContaining('50') });
  });

  // ── TC-3: 200 OK (admin + valid PRD + mocked Anthropic) ───────────────────

  it('TC-3: returns 200 with questions array when session is admin and PRD is valid', async () => {
    mockAdminSession();

    const mockQuestionsResponse = {
      questions: [
        { id: 'q1', text: 'Kto jest głównym użytkownikiem?', type: 'text', required: true },
        {
          id: 'q2',
          text: 'Który zakres jest priorytetem MVP?',
          type: 'choice',
          options: ['MVP', 'Pełna wersja', 'Faza testów'],
          required: true,
        },
        {
          id: 'q3',
          text: 'Jakie są kluczowe przepływy użytkownika?',
          type: 'text',
          required: true,
        },
      ],
    };

    // Set up the mock Anthropic constructor to return an instance
    // whose messages.create resolves with the expected AI response
    getAnthropicMock().mockImplementationOnce(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(mockQuestionsResponse) }],
        } as any),
      },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty('questions');
    expect(Array.isArray(json.questions)).toBe(true);
    expect(json.questions.length).toBeGreaterThanOrEqual(1);
    expect(json.questions[0]).toMatchObject({
      id: expect.any(String),
      text: expect.any(String),
      type: expect.any(String),
      required: expect.any(Boolean),
    });
  });
});
