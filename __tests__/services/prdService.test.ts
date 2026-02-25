/**
 * __tests__/services/prdService.test.ts
 * STORY-7.4 — Unit tests for prdService
 *
 * Test matrix:
 *  TC-1  getQuestions happy path → returns questions array
 *  TC-2  getQuestions 422 error → throws Error with message
 *  TC-3  getQuestions 500 error → throws fallback error
 *  TC-4  createFromPrd happy path → returns CreateFromPrdResponse
 *  TC-5  createFromPrd 409 error → throws error with status 409
 *  TC-6  createFromPrd 500 error → throws fallback error
 */

import { jest } from '@jest/globals';

// Store original fetch
const originalFetch = global.fetch;

// ─── Helper to mock fetch ────────────────────────────────────────────────────

function mockFetch(response: Response) {
  global.fetch = jest.fn<Promise<Response>, [RequestInfo, RequestInit?]>().mockResolvedValue(response);
}

// ─── Imports ─────────────────────────────────────────────────────────────────

import { prdService } from '@/services/prdService';

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_PRD = `
Budujemy aplikację do zarządzania zadaniami dla małych teamów.
Użytkownicy mogą tworzyć projekty, przypisywać zadania i śledzić postęp.
`.trim();

const MOCK_QUESTIONS = {
  questions: [
    { id: 'q1', text: 'Kto jest głównym użytkownikiem?', type: 'text', required: true },
    { id: 'q2', text: 'Jaki zakres MVP?', type: 'choice', options: ['MVP', 'Pełna'], required: true },
  ],
};

const MOCK_CREATE_RESPONSE = {
  project_key: 'test-project',
  epics: [
    {
      epic_id: 'EPIC-1',
      title: 'Auth',
      stories: [{ id: 'STORY-1.1', title: 'Setup', domain: 'database', size: 'short', dod: 'Done' }],
      stories_count: 1,
    },
  ],
  epics_count: 1,
  stories_count: 1,
  bridge_output: 'Bridge output here',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('prdService', () => {
  beforeEach(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuestions', () => {
    it('TC-1: returns questions array on successful response', async () => {
      mockFetch(new Response(JSON.stringify(MOCK_QUESTIONS), { status: 200 }));

      const result = await prdService.getQuestions(VALID_PRD);

      expect(result).toEqual(MOCK_QUESTIONS);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toHaveProperty('id', 'q1');
    });

    it('TC-2: throws Error with message on 422 response', async () => {
      mockFetch(
        new Response(JSON.stringify({ error: 'PRD nie mogło zostać przetworzone' }), { status: 422 })
      );

      await expect(prdService.getQuestions(VALID_PRD)).rejects.toThrow('PRD nie mogło zostać przetworzone');
    });

    it('TC-3: throws fallback error on 500 response', async () => {
      mockFetch(new Response(null, { status: 500 }));

      await expect(prdService.getQuestions(VALID_PRD)).rejects.toThrow('HTTP 500');
    });
  });

  describe('createFromPrd', () => {
    const validPayload = {
      prd_text: VALID_PRD,
      project_name: 'Test Project',
      project_key: 'test-project',
      answers: { q1: 'Odpowiedź 1', q2: 'MVP' },
    };

    it('TC-4: returns CreateFromPrdResponse on successful creation', async () => {
      mockFetch(new Response(JSON.stringify(MOCK_CREATE_RESPONSE), { status: 200 }));

      const result = await prdService.createFromPrd(validPayload);

      expect(result).toEqual(MOCK_CREATE_RESPONSE);
      expect(result.project_key).toBe('test-project');
      expect(result.epics_count).toBe(1);
    });

    it('TC-5: throws error with status 409 on duplicate project', async () => {
      mockFetch(
        new Response(JSON.stringify({ error: 'Projekt o tym kluczu już istnieje' }), { status: 409 })
      );

      try {
        await prdService.createFromPrd(validPayload);
        fail('Should have thrown');
      } catch (error) {
        const err = error as Error & { status: number };
        expect(err.message).toBe('Projekt o tym kluczu już istnieje');
        expect(err.status).toBe(409);
      }
    });

    it('TC-6: throws fallback error on 500 response', async () => {
      mockFetch(new Response(null, { status: 500 }));

      try {
        await prdService.createFromPrd(validPayload);
        fail('Should have thrown');
      } catch (error) {
        const err = error as Error & { status: number };
        expect(err.message).toBe('HTTP 500');
        expect(err.status).toBe(500);
      }
    });

    it('TC-7: throws error with message from response body on 400', async () => {
      mockFetch(
        new Response(JSON.stringify({ error: 'Nieprawidłowe dane wejściowe' }), { status: 400 })
      );

      await expect(prdService.createFromPrd(validPayload)).rejects.toThrow('Nieprawidłowe dane wejściowe');
    });
  });
});
