/**
 * __tests__/services/nightclaw.service.test.ts
 * STORY-9.5 — Unit tests for nightclaw.service
 *
 * Test matrix:
 *  TC-1  fetchDigest — happy path (no date) returns DigestResponse
 *  TC-2  fetchDigest — happy path (with date) builds correct URL
 *  TC-3  fetchDigest — 401 throws Polish error message
 *  TC-4  fetchDigest — 404 throws Polish error message
 *  TC-5  fetchDigest — 500 throws Polish error message
 *  TC-6  fetchDigest — 503 throws Polish error message
 *  TC-7  fetchDigest — network error throws Polish error message
 *  TC-8  fetchHistory — happy path returns HistoryResponse
 *  TC-9  fetchSkillsDiff — happy path returns SkillsDiffResponse
 * TC-10  fetchResearch — happy path returns ResearchResponse
 * TC-11  fetchHistory — 401 throws Polish error
 * TC-12  fetchSkillsDiff — 401 throws Polish error
 * TC-13  fetchResearch — 401 throws Polish error
 * TC-14  fetchDigest — unknown status throws generic error
 */

import { jest } from '@jest/globals'
import type {
  DigestResponse,
  HistoryResponse,
  SkillsDiffResponse,
  ResearchResponse,
} from '@/types/nightclaw'

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn<Promise<Response>, [string]>()
global.fetch = mockFetch as typeof fetch

// ─── Import SUT ───────────────────────────────────────────────────────────────

import {
  fetchDigest,
  fetchHistory,
  fetchSkillsDiff,
  fetchResearch,
} from '@/services/nightclaw.service'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_DIGEST: DigestResponse = {
  date: '2026-02-25',
  markdown: '# NightClaw Digest\n\nSome content',
  summary: {
    new_patterns: 2,
    lessons_extracted: 3,
    anti_patterns_flagged: 1,
    open_issues: 0,
    generated_at: '2026-02-25T02:00:00Z',
  },
  model_stats: {
    models: {
      kimi: {
        stories_completed: 10,
        stories_failed: 1,
        success_rate: 0.91,
        avg_duration_min: 12,
        last_story_id: 'STORY-9.1',
        stories_with_refactor: 2,
      },
    },
    last_updated: '2026-02-25T02:00:00Z',
    next_review: '2026-02-26T02:00:00Z',
  },
}

const MOCK_HISTORY: HistoryResponse = {
  entries: [
    { date: '2026-02-25', status: 'ok' },
    { date: '2026-02-24', status: 'error' },
    { date: '2026-02-23', status: 'missing' },
  ],
  total_runs: 2,
  total_errors: 1,
}

const MOCK_SKILLS_DIFF: SkillsDiffResponse = {
  skills: [
    {
      name: 'kira-implementor',
      path: '/path/to/SKILL.md',
      diff: '@@ -1,3 +1,5 @@\n+new line\n context',
      lines_added: 1,
      lines_removed: 0,
      modified_at: '2026-02-25T01:30:00Z',
    },
  ],
  total_modified: 1,
}

const MOCK_RESEARCH: ResearchResponse = {
  files: [
    {
      filename: 'solution-abc.md',
      title: 'Solution ABC',
      preview: 'Short preview text',
      content: '# Full content here',
      modified_at: '2026-02-25T01:00:00Z',
    },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockOk(body: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  } as Response)
}

function mockFail(status: number): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
  } as Response)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('nightclaw.service', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  // ─── fetchDigest ───────────────────────────────────────────────────────────

  describe('fetchDigest', () => {
    it('TC-1: returns DigestResponse when no date provided', async () => {
      mockOk(MOCK_DIGEST)
      const result = await fetchDigest()
      expect(result).toEqual(MOCK_DIGEST)
      expect(mockFetch).toHaveBeenCalledWith('/api/nightclaw/digest')
    })

    it('TC-2: builds correct URL when date provided', async () => {
      mockOk(MOCK_DIGEST)
      const result = await fetchDigest('2026-02-25')
      expect(result).toEqual(MOCK_DIGEST)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/nightclaw/digest?date=2026-02-25'
      )
    })

    it('TC-3: 401 throws "Sesja wygasła — zaloguj się ponownie"', async () => {
      mockFail(401)
      await expect(fetchDigest()).rejects.toThrow(
        'Sesja wygasła — zaloguj się ponownie'
      )
    })

    it('TC-4: 404 throws "Brak danych dla wybranego dnia"', async () => {
      mockFail(404)
      await expect(fetchDigest('2020-01-01')).rejects.toThrow(
        'Brak danych dla wybranego dnia'
      )
    })

    it('TC-5: 500 throws "Błąd serwera — Bridge może być offline"', async () => {
      mockFail(500)
      await expect(fetchDigest()).rejects.toThrow(
        'Błąd serwera — Bridge może być offline'
      )
    })

    it('TC-6: 503 throws "Błąd serwera — Bridge może być offline"', async () => {
      mockFail(503)
      await expect(fetchDigest()).rejects.toThrow(
        'Błąd serwera — Bridge może być offline'
      )
    })

    it('TC-7: network error throws "Brak połączenia z serwerem"', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(fetchDigest()).rejects.toThrow('Brak połączenia z serwerem')
    })

    it('TC-14: unknown status (e.g. 418) throws generic offline error', async () => {
      mockFail(418)
      await expect(fetchDigest()).rejects.toThrow(
        'Błąd serwera — Bridge może być offline'
      )
    })
  })

  // ─── fetchHistory ──────────────────────────────────────────────────────────

  describe('fetchHistory', () => {
    it('TC-8: returns HistoryResponse on success', async () => {
      mockOk(MOCK_HISTORY)
      const result = await fetchHistory()
      expect(result).toEqual(MOCK_HISTORY)
      expect(mockFetch).toHaveBeenCalledWith('/api/nightclaw/history')
    })

    it('TC-11: 401 throws Polish error', async () => {
      mockFail(401)
      await expect(fetchHistory()).rejects.toThrow(
        'Sesja wygasła — zaloguj się ponownie'
      )
    })

    it('network error throws Polish error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(fetchHistory()).rejects.toThrow('Brak połączenia z serwerem')
    })
  })

  // ─── fetchSkillsDiff ───────────────────────────────────────────────────────

  describe('fetchSkillsDiff', () => {
    it('TC-9: returns SkillsDiffResponse on success', async () => {
      mockOk(MOCK_SKILLS_DIFF)
      const result = await fetchSkillsDiff()
      expect(result).toEqual(MOCK_SKILLS_DIFF)
      expect(mockFetch).toHaveBeenCalledWith('/api/nightclaw/skills-diff')
    })

    it('TC-12: 401 throws Polish error', async () => {
      mockFail(401)
      await expect(fetchSkillsDiff()).rejects.toThrow(
        'Sesja wygasła — zaloguj się ponownie'
      )
    })

    it('network error throws Polish error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(fetchSkillsDiff()).rejects.toThrow(
        'Brak połączenia z serwerem'
      )
    })
  })

  // ─── fetchResearch ─────────────────────────────────────────────────────────

  describe('fetchResearch', () => {
    it('TC-10: returns ResearchResponse on success', async () => {
      mockOk(MOCK_RESEARCH)
      const result = await fetchResearch()
      expect(result).toEqual(MOCK_RESEARCH)
      expect(mockFetch).toHaveBeenCalledWith('/api/nightclaw/research')
    })

    it('TC-13: 401 throws Polish error', async () => {
      mockFail(401)
      await expect(fetchResearch()).rejects.toThrow(
        'Sesja wygasła — zaloguj się ponownie'
      )
    })

    it('network error throws Polish error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(fetchResearch()).rejects.toThrow('Brak połączenia z serwerem')
    })
  })
})
