/**
 * __tests__/api/stories.test.ts
 * STORY-12.7 — Integration tests for GET /api/stories endpoint
 * TDD: written before implementation (RED phase).
 *
 * Test matrix:
 *  AC-1: GET /api/stories returns stories list from Supabase
 *  AC-2: Filtering by epic and status works
 *  AC-3: Auth required (401 without JWT)
 *  AC-4: Empty result → 200 { data: [], meta: { total: 0 } }
 *  AC-5: Response schema is compatible with frontend BridgeStory type
 *  EC-1: depends_on / blocks null → empty arrays
 *  EC-2: Supabase error → 500
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mock next/server ─────────────────────────────────────────────────────────

class MockNextResponse extends Response {
  static override json(body: unknown, init?: ResponseInit): MockNextResponse {
    return new MockNextResponse(JSON.stringify(body), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string>),
      },
    })
  }
}

jest.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}))

// ─── Mock requireRole ─────────────────────────────────────────────────────────

const mockRequireAuth = jest.fn()
jest.mock('@/lib/auth/requireRole', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

// ─── Mock Supabase ────────────────────────────────────────────────────────────
// Stories query chain:
//   from('bridge_stories')
//     .select('*', { count: 'exact' })
//     .eq('project_id', project)          ← always
//     [.eq('epic_id', epic)]              ← optional
//     [.eq('status', status)]             ← optional
//     .order('epic_id')
//     .order('id')
//     .limit(limit)                       ← awaited here
//
// The key insight: every step in the chain must return an object with ALL
// subsequent methods (eq, order, limit) so that optional filters can be
// inserted anywhere.

const mockLimit  = jest.fn()
const mockOrder2 = jest.fn()
const mockOrder1 = jest.fn()

// Every .eq() call (project_id, epic_id, status) returns the same builder
// shape — supporting further .eq(), .order(), and .limit()
const mockEqEpic   = jest.fn()  // second  eq (epic_id or status)
const mockEqStatus = jest.fn()  // third   eq (status after epic_id)
const mockEqProject = jest.fn() // first   eq (project_id)

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}))

// ─── Reset mocks ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()

  // Terminal: limit() → awaited → { data, error, count }
  // (mockLimit itself is resolved by each test)

  // order('id') → { limit }
  mockOrder2.mockReturnValue({ limit: mockLimit })

  // order('epic_id') → { order: mockOrder2, limit: mockLimit }
  // (limit directly in case id order is skipped, but we always have both)
  mockOrder1.mockReturnValue({ order: mockOrder2, limit: mockLimit })

  // eq('status', ...) → { order: mockOrder1 }
  mockEqStatus.mockReturnValue({ order: mockOrder1, limit: mockLimit })

  // eq('epic_id' or 'status', ...) → { eq: mockEqStatus, order: mockOrder1 }
  mockEqEpic.mockReturnValue({ eq: mockEqStatus, order: mockOrder1, limit: mockLimit })

  // eq('project_id', ...) → { eq: mockEqEpic, order: mockOrder1, limit: mockLimit }
  mockEqProject.mockReturnValue({ eq: mockEqEpic, order: mockOrder1, limit: mockLimit })

  const selectChain = { eq: mockEqProject }
  const fromChain   = { select: jest.fn().mockReturnValue(selectChain) }
  mockFrom.mockReturnValue(fromChain)
})

// ─── Auth helpers ──────────────────────────────────────────────────────────────

function allowAuth() {
  mockRequireAuth.mockResolvedValue({ user: { id: 'user-id' }, role: 'USER' })
}

function denyAuth() {
  mockRequireAuth.mockResolvedValue(
    MockNextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
  )
}

// ─── Request factory ──────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): any {
  const url = new URL('http://localhost/api/stories')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return { nextUrl: url }
}

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/stories/route'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_STORIES = [
  {
    project_id: 'kira-dashboard',
    id: 'STORY-1.1',
    epic_id: 'EPIC-1',
    title: 'Story One',
    status: 'DONE',
    difficulty: 'simple',
    recommended_model: 'kimi',
    assigned_model: 'kimi',
    domain: 'backend',
    priority: 'must',
    estimated_effort: '2h',
    depends_on: ['STORY-0.1'],
    blocks: ['STORY-1.2'],
  },
  {
    project_id: 'kira-dashboard',
    id: 'STORY-1.2',
    epic_id: 'EPIC-1',
    title: 'Story Two',
    status: 'IN_PROGRESS',
    difficulty: 'moderate',
    recommended_model: 'sonnet',
    assigned_model: null,
    domain: 'frontend',
    priority: 'should',
    estimated_effort: '4h',
    depends_on: null,   // EC-1: null → []
    blocks: null,       // EC-1: null → []
  },
]

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/stories', () => {

  // ── AC-3: Auth required ────────────────────────────────────────────────────

  it('returns 401 when not authenticated (AC-3)', async () => {
    denyAuth()

    const req = makeRequest()
    const res = await GET(req as any)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-1: Returns stories list from Supabase ───────────────────────────────

  it('returns list of stories for authenticated user (AC-1)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: MOCK_STORIES, error: null, count: 2 })

    const req = makeRequest({ project: 'kira-dashboard' })
    const res = await GET(req as any)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data).toHaveLength(2)
    expect(json).toHaveProperty('meta')
    expect(json.meta).toMatchObject({ total: 2 })
  })

  it('returns correct story shape (AC-5: schema compatible with frontend)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [MOCK_STORIES[0]], error: null, count: 1 })

    const req = makeRequest({ project: 'kira-dashboard' })
    const res = await GET(req as any)
    const json = await res.json()

    const story = json.data[0]
    expect(story).toMatchObject({
      id: 'STORY-1.1',
      epic_id: 'EPIC-1',
      title: 'Story One',
      status: 'DONE',
      difficulty: 'simple',
      recommended_model: 'kimi',
      assigned_model: 'kimi',
      domain: 'backend',
      priority: 'must',
      estimated_effort: '2h',
      depends_on: ['STORY-0.1'],
      blocks: ['STORY-1.2'],
    })
  })

  it('maps null depends_on / blocks to empty arrays (EC-1)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [MOCK_STORIES[1]], error: null, count: 1 })

    const req = makeRequest({ project: 'kira-dashboard' })
    const res = await GET(req as any)
    const json = await res.json()

    const story = json.data[0]
    expect(story.depends_on).toEqual([])
    expect(story.blocks).toEqual([])
  })

  it('uses default project kira-dashboard when no query param provided', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [], error: null, count: 0 })

    const req = makeRequest()
    await GET(req as any)

    // First eq call should be eq('project_id', 'kira-dashboard')
    expect(mockEqProject).toHaveBeenCalledWith('project_id', 'kira-dashboard')
  })

  it('uses provided project param', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [], error: null, count: 0 })

    const req = makeRequest({ project: 'my-project' })
    await GET(req as any)

    expect(mockEqProject).toHaveBeenCalledWith('project_id', 'my-project')
  })

  // ── AC-2: Filtering ───────────────────────────────────────────────────────

  it('applies epic filter when provided (AC-2)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [MOCK_STORIES[0]], error: null, count: 1 })

    const req = makeRequest({ project: 'kira-dashboard', epic: 'EPIC-1' })
    const res = await GET(req as any)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    // epic filter applied
    expect(mockEqEpic).toHaveBeenCalledWith('epic_id', 'EPIC-1')
  })

  it('applies status filter when provided (AC-2)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [MOCK_STORIES[0]], error: null, count: 1 })

    const req = makeRequest({ project: 'kira-dashboard', status: 'DONE' })
    const res = await GET(req as any)

    expect(res.status).toBe(200)
    // status filter applied
    expect(mockEqEpic).toHaveBeenCalledWith('status', 'DONE')
  })

  // ── AC-4: Empty result → 200 with empty array ─────────────────────────────

  it('returns 200 with empty array when no stories found (AC-4)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [], error: null, count: 0 })

    const req = makeRequest({ project: 'kira-dashboard', epic: 'EPIC-999' })
    const res = await GET(req as any)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ data: [], meta: { total: 0 } })
  })

  // ── Error handling (EC-2) ─────────────────────────────────────────────────

  it('returns 500 when Supabase query fails (EC-2)', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
      count: null,
    })

    const req = makeRequest({ project: 'kira-dashboard' })
    const res = await GET(req as any)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(json.error).toContain('Database connection failed')
  })

  // ── Cache headers ─────────────────────────────────────────────────────────

  it('includes no-store cache header', async () => {
    allowAuth()
    mockLimit.mockResolvedValueOnce({ data: [], error: null, count: 0 })

    const req = makeRequest()
    const res = await GET(req as any)

    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
