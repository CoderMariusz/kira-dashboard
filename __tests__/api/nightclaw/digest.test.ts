/**
 * __tests__/api/nightclaw/digest.test.ts
 * STORY-12.10 — Integration tests for GET /api/nightclaw/digest (Supabase migration)
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

const mockSingle = jest.fn()
const mockLimit = jest.fn(() => ({ single: mockSingle }))
const mockOrder = jest.fn(() => ({ limit: mockLimit }))
const mockEq = jest.fn(() => ({ single: mockSingle }))
const mockSelect = jest.fn(() => ({ eq: mockEq, order: mockOrder }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/nightclaw/digest/route'

// ─── Sample fixture data ──────────────────────────────────────────────────────

const MOCK_DIGEST = {
  id: 'uuid-1',
  run_date: '2026-02-26',
  content_md: '# NightClaw Digest — 2026-02-26\n\nSome content here.',
  summary: 'EPIC-12 progress: 8/15 stories done',
  stories_done: 8,
  stories_failed: 1,
  models_used: { kimi: 3, sonnet: 5 },
  created_at: '2026-02-26T02:00:00Z',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allowAuth() {
  mockRequireAuth.mockResolvedValue({ user: { id: 'user-id' }, role: 'USER' })
}

function denyAuth() {
  mockRequireAuth.mockResolvedValue(
    MockNextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
  )
}

function mockDigestRequest(params: string = ''): any {
  const url = new URL(`http://localhost/api/nightclaw/digest${params}`)
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

describe('GET /api/nightclaw/digest', () => {
  // ── AC-6: Auth required ─────────────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-6)', async () => {
    denyAuth()
    const res = await GET(mockDigestRequest('?date=2026-02-26'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-1: GET with date param ───────────────────────────────────────────────

  it('returns digest for specific date from Supabase (AC-1)', async () => {
    allowAuth()
    mockSingle.mockResolvedValueOnce({ data: MOCK_DIGEST, error: null })

    const res = await GET(mockDigestRequest('?date=2026-02-26'))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('run_date', '2026-02-26')
    expect(json).toHaveProperty('content_md')
    expect(json).toHaveProperty('summary')
    expect(json).toHaveProperty('stories_done', 8)
  })

  it('queries nightclaw_digests with eq run_date when date provided (AC-1)', async () => {
    allowAuth()
    mockSingle.mockResolvedValueOnce({ data: MOCK_DIGEST, error: null })

    await GET(mockDigestRequest('?date=2026-02-26'))

    expect(mockFrom).toHaveBeenCalledWith('nightclaw_digests')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('run_date', '2026-02-26')
  })

  // ── AC-2: GET without date → latest ─────────────────────────────────────────

  it('returns latest digest when no date param (AC-2)', async () => {
    allowAuth()
    mockSingle.mockResolvedValueOnce({ data: MOCK_DIGEST, error: null })

    const res = await GET(mockDigestRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('run_date')
  })

  it('queries with ORDER BY run_date DESC LIMIT 1 when no date (AC-2)', async () => {
    allowAuth()
    mockSingle.mockResolvedValueOnce({ data: MOCK_DIGEST, error: null })

    await GET(mockDigestRequest())

    expect(mockFrom).toHaveBeenCalledWith('nightclaw_digests')
    expect(mockOrder).toHaveBeenCalledWith('run_date', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(1)
  })

  // ── 404 when no digest found ────────────────────────────────────────────────

  it('returns 404 when no digest found for date (AC-1 edge)', async () => {
    allowAuth()
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'not found' } })

    const res = await GET(mockDigestRequest('?date=2026-01-01'))
    expect(res.status).toBe(404)

    const json = await res.json()
    expect(json).toHaveProperty('error', 'No digest found')
  })

  it('returns 404 when Supabase returns null data', async () => {
    allowAuth()
    mockSingle.mockResolvedValueOnce({ data: null, error: null })

    const res = await GET(mockDigestRequest('?date=2026-01-01'))
    expect(res.status).toBe(404)
  })

  // ── Cache-Control header ────────────────────────────────────────────────────

  it('includes Cache-Control: no-store header', async () => {
    allowAuth()
    mockSingle.mockResolvedValueOnce({ data: MOCK_DIGEST, error: null })

    const res = await GET(mockDigestRequest('?date=2026-02-26'))
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
