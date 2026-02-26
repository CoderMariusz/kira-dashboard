/**
 * __tests__/api/nightclaw/research.test.ts
 * STORY-12.10 — Integration tests for GET /api/nightclaw/research (Supabase migration)
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

// Chain: from → select → order [→ eq (optional status filter)]
const mockQueryResult = jest.fn()
const mockEq = jest.fn(() => mockQueryResult())
const mockOrder = jest.fn(() => {
  // Return object that can be awaited (default) or chained with .eq()
  const chainable = mockQueryResult()
  chainable.eq = mockEq
  return chainable
})
const mockSelect = jest.fn(() => ({ order: mockOrder }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/nightclaw/research/route'

// ─── Sample fixture data ──────────────────────────────────────────────────────

const MOCK_RESEARCH = [
  {
    id: 'uuid-1',
    slug: 'cost-optimization',
    title: 'AI Coding Agents Cost Optimization',
    problem: 'Kimi K2.5 costs money and we need to optimize.',
    solution: 'Use cheaper models for simple tasks.',
    status: 'implemented',
    created_at: '2026-02-20T10:00:00Z',
  },
  {
    id: 'uuid-2',
    slug: 'model-routing',
    title: 'Model Routing Strategy',
    problem: 'Need to route stories to the right model.',
    solution: 'Difficulty-based routing with fallback chain.',
    status: 'open',
    created_at: '2026-02-19T10:00:00Z',
  },
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

function mockResearchRequest(params: string = ''): any {
  const url = new URL(`http://localhost/api/nightclaw/research${params}`)
  return {
    nextUrl: url,
    url: url.toString(),
    method: 'GET',
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default: resolve with data
  mockQueryResult.mockReturnValue(Promise.resolve({ data: MOCK_RESEARCH, error: null }))
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/nightclaw/research', () => {
  // ── AC-6: Auth required ─────────────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-6)', async () => {
    denyAuth()
    const res = await GET(mockResearchRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-4: Returns research findings list ────────────────────────────────────

  it('returns list of research findings from Supabase (AC-4)', async () => {
    allowAuth()

    const res = await GET(mockResearchRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.length).toBe(2)
  })

  it('each entry has slug, title, problem, solution, status (AC-4)', async () => {
    allowAuth()

    const res = await GET(mockResearchRequest())
    const json = await res.json()

    for (const entry of json.data) {
      expect(entry).toHaveProperty('slug')
      expect(entry).toHaveProperty('title')
      expect(entry).toHaveProperty('problem')
      expect(entry).toHaveProperty('solution')
      expect(entry).toHaveProperty('status')
    }
  })

  it('queries nightclaw_research table ordered by created_at desc (AC-4)', async () => {
    allowAuth()

    await GET(mockResearchRequest())

    expect(mockFrom).toHaveBeenCalledWith('nightclaw_research')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  // ── Status filter ───────────────────────────────────────────────────────────

  it('filters by status when query param provided (AC-4)', async () => {
    allowAuth()
    mockEq.mockReturnValueOnce(Promise.resolve({
      data: [MOCK_RESEARCH[1]],
      error: null,
    }))

    const res = await GET(mockResearchRequest('?status=open'))
    expect(res.status).toBe(200)

    expect(mockEq).toHaveBeenCalledWith('status', 'open')
  })

  // ── Empty state ─────────────────────────────────────────────────────────────

  it('returns empty array when no research exists (EC-1)', async () => {
    allowAuth()
    mockQueryResult.mockReturnValue(Promise.resolve({ data: [], error: null }))

    const res = await GET(mockResearchRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    allowAuth()
    mockQueryResult.mockReturnValue(Promise.resolve({ data: null, error: null }))

    const res = await GET(mockResearchRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toEqual([])
  })

  // ── Cache-Control header ────────────────────────────────────────────────────

  it('includes Cache-Control: no-store header', async () => {
    allowAuth()

    const res = await GET(mockResearchRequest())
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
