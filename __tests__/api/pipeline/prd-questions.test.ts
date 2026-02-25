/**
 * __tests__/api/pipeline/prd-questions.test.ts
 * STORY-7.2 / STORY-14.4 — Integration tests for POST /api/pipeline/prd-questions
 *
 * Test matrix:
 *  TC-1  401 — no session (unauthenticated)
 *  TC-2  400 — admin session but prd_text too short (<50 chars)
 *  TC-3  200 — admin session + valid prd_text + mocked Anthropic response
 *  TC-4  400 — prd_text too long (> 20000 chars)
 *  TC-5  503 — Anthropic API error
 *  TC-6  422 — AI returns non-text block
 *  TC-7  422 — AI returns invalid JSON
 *  TC-8  422 — AI returns empty questions array
 *  TC-9  422 — Question missing required fields
 *  TC-10 422 — Choice type question missing options
 *  TC-11 422 — Choice type question with fewer than 2 options
 *  TC-12 422 — Choice options containing non-string values
 *  TC-13 200 — Questions array sliced to max 5
 */

import { jest } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Mock Supabase server client — controlled per-test via helpers
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock next/headers (cookies) — required by createClient even when mocked above
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => {
    const getAll = () => [];
    const set = jest.fn();
    return Promise.resolve({ getAll, set });
  }),
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
    const createMock = jest.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(mockQuestionsResponse) }],
      })
    );

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
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

  // ── TC-4: 400 prd_text too long (> 20000) ──────────────────────────────────

  it('TC-4: returns 400 when prd_text exceeds 20000 characters', async () => {
    mockAdminSession();

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: 'A'.repeat(20001) },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('20 000');
  });

  // ── TC-5: 503 Anthropic API error ──────────────────────────────────────────

  it('TC-5: returns 503 when Anthropic API fails', async () => {
    mockAdminSession();

    const createMock = jest.fn(() => Promise.reject(new Error('API Error')));

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error.toLowerCase()).toContain('niedostępny');
  });

  // ── TC-6: 422 AI returns non-text block ────────────────────────────────────

  it('TC-6: returns 422 when AI returns non-text content block', async () => {
    mockAdminSession();

    const createMock = jest.fn(() => Promise.resolve({ content: [{ type: 'image' }] }));

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('nie wygenerowało');
  });

  // ── TC-7: 422 AI returns invalid JSON ──────────────────────────────────────

  it('TC-7: returns 422 when AI returns invalid JSON', async () => {
    mockAdminSession();

    const createMock = jest.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: 'not valid json' }],
      })
    );

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('nie wygenerowało');
  });

  // ── TC-8: 422 AI returns empty questions array ─────────────────────────────

  it('TC-8: returns 422 when AI returns empty questions array', async () => {
    mockAdminSession();

    const createMock = jest.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify({ questions: [] }) }],
      })
    );

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('nie wygenerowało');
  });

  // ── TC-9: 422 Question missing required fields ─────────────────────────────

  it('TC-9: returns 422 when question is missing required fields', async () => {
    mockAdminSession();

    const invalidResponse = {
      questions: [
        { id: 'q1', text: 'Valid question', type: 'text', required: true },
        { id: 'q2', text: 'Missing required field' } // missing type and required
      ],
    };

    const createMock = jest.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(invalidResponse) }],
      })
    );

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('brak wymaganych pól');
  });

  // ── TC-10: 422 Choice type question missing options ────────────────────────

  it('TC-10: returns 422 when choice question has no options', async () => {
    mockAdminSession();

    const invalidResponse = {
      questions: [
        { id: 'q1', text: 'Valid question', type: 'text', required: true },
        { id: 'q2', text: 'Choice without options', type: 'choice', required: true } // missing options
      ],
    };

    const createMock = jest.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(invalidResponse) }],
      })
    );

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('bez wymaganych opcji');
  });

  // ── TC-11: 422 Choice type question with fewer than 2 options ──────────────

  it('TC-11: returns 422 when choice question has fewer than 2 options', async () => {
    mockAdminSession();

    const invalidResponse = {
      questions: [
        { id: 'q1', text: 'Valid question', type: 'text', required: true },
        { id: 'q2', text: 'Choice with 1 option', type: 'choice', required: true, options: ['Only one'] }
      ],
    };

    const createMock = jest.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(invalidResponse) }],
      })
    );

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('bez wymaganych opcji');
  });

  // ── TC-12: 422 Choice options containing non-string values ─────────────────

  it('TC-12: returns 422 when choice options contain non-string values', async () => {
    mockAdminSession();

    const invalidResponse = {
      questions: [
        {
          id: 'q1',
          text: 'Choice with invalid options',
          type: 'choice',
          required: true,
          options: ['Valid', 123, null] // contains non-strings
        },
      ],
    };

    const createMock = jest.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(invalidResponse) }],
      })
    );

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.toLowerCase()).toContain('bez wymaganych opcji');
  });

  // ── TC-13: 200 Questions array sliced to max 5 ─────────────────────────────

  it('TC-13: returns at most 5 questions even when AI returns more', async () => {
    mockAdminSession();

    const manyQuestions = {
      questions: Array.from({ length: 8 }, (_, i) => ({
        id: `q${i + 1}`,
        text: `Question ${i + 1}`,
        type: 'text',
        required: true,
      })),
    };

    const createMock = jest.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify(manyQuestions) }],
      })
    );

    getAnthropicMock().mockImplementationOnce(() => ({
      messages: { create: createMock },
    }));

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/pipeline/prd-questions',
      body: { prd_text: VALID_PRD },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.questions.length).toBe(5);
  });
});
