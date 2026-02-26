/**
 * __tests__/api/nightclaw/history.test.ts
 * STORY-12.10 — Integration tests for GET /api/nightclaw/history (Supabase migration)
 * TDD: rewritten for Supabase-backed endpoint.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mock next/server ─────────────────────────────────────────────────────────

class MockNextResponse extends Response {
  static override json(body: unknown, init?: ResponseInit): MockNextResponse {
    return new MockNextResponse(JSON.stringify(body), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) },
    })
  }
}

jest.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}))

// ─── Mock requireAuth ─────────────────────────────────────────────────────────

const mockRequireAuth = jest.fn()
jest.mock('@/lib/auth/requireRole', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockLimit = jest.fn()
const mockOrder = jest.fn(() => ({ limit: mockLimit }))
const mockSelect = jest.fn(() => ({ order: mockOrder }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/nightclaw/history/route'

// ─── Sample fixture data ──────────────────────────────────────────────────────

const MOCK_HISTORY = [
  { run_date: '2026-02-26', summary: 'EPIC-12 progress', stories_done: 8, stories_failed: 1, models_used: { kimi: 3 } },
  { run_date: '2026-02-25', summary: 'EPIC-10 done', stories_done: 8, stories_failed: 0, models_used: { sonnet: 5 } },
  { run_date: '2026-02-24', summary: 'EPIC-9 done', stories_done: 8, stories_failed: 2, models_used: { codex: 4 } },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allowAuth() {
  mockRequireAuth.mockResolvedValue({ user: { id: 'user-id' }, role: 'USER' })
}

function denyAuth() {
  mockRequireAuth.mockResolvedValue(
    MockNextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
  )
}

function mockHistoryRequest(params: string = ''): any {
  const url = new URL(`http://localhost/api/nightclaw/history${params}`)
  return {
    nextUrl: url,
    url: url.toString(),
    method: 'GET',
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/nightclaw/history', () => {
  // ── AC-6: Auth required ─────────────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-6)', async () => {
    denyAuth()
    const res = await GET(mockHistoryRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-3: Returns digest summaries list ─────────────────────────────────────

  it('returns list of digest summaries from Supabase (AC-3)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: MOCK_HISTORY, error: null })

    const res = await GET(mockHistoryRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.length).toBe(3)
  })

  it('each entry has run_date, summary, stories_done, stories_failed (AC-3)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: MOCK_HISTORY, error: null })

    const res = await GET(mockHistoryRequest())
    const json = await res.json()

    for (const entry of json.data) {
      expect(entry).toHaveProperty('run_date')
      expect(entry).toHaveProperty('summary')
      expect(entry).toHaveProperty('stories_done')
      expect(entry).toHaveProperty('stories_failed')
    }
  })

  it('selects correct columns from nightclaw_digests (AC-3)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: MOCK_HISTORY, error: null })

    await GET(mockHistoryRequest())

    expect(mockFrom).toHaveBeenCalledWith('nightclaw_digests')
    expect(mockSelect).toHaveBeenCalledWith('run_date, summary, stories_done, stories_failed, models_used')
    expect(mockOrder).toHaveBeenCalledWith('run_date', { ascending: false })
  })

  // ── Limit param ─────────────────────────────────────────────────────────────

  it('defaults to limit 30 (AC-3)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: MOCK_HISTORY, error: null })

    await GET(mockHistoryRequest())

    expect(mockLimit).toHaveBeenCalledWith(30)
  })

  it('respects custom limit query param (AC-3)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: MOCK_HISTORY, error: null })

    await GET(mockHistoryRequest('?limit=10'))

    expect(mockLimit).toHaveBeenCalledWith(10)
  })

  it('caps limit at 90 (AC-3 edge)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: MOCK_HISTORY, error: null })

    await GET(mockHistoryRequest('?limit=200'))

    expect(mockLimit).toHaveBeenCalledWith(90)
  })

  // ── Empty state ─────────────────────────────────────────────────────────────

  it('returns empty array when no digests exist (EC-1)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    const res = await GET(mockHistoryRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: null, error: null })

    const res = await GET(mockHistoryRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toEqual([])
  })

  // ── Cache-Control header ────────────────────────────────────────────────────

  it('includes Cache-Control: no-store header', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: MOCK_HISTORY, error: null })

    const res = await GET(mockHistoryRequest())
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
