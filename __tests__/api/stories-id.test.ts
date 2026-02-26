/**
 * __tests__/api/stories-id.test.ts
 * STORY-12.7 — Integration tests for GET /api/stories/[id] endpoint
 * TDD: written before implementation (RED phase).
 *
 * Test matrix:
 *  AC-3: GET /api/stories/[id] returns story details + runs from Supabase
 *  AC-3: Auth required
 *  AC-3: 404 when story not found
 *  EC-4: depends_on / blocks null → empty arrays in [id] response too
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
// Two independent query chains:
//   1. stories: from('bridge_stories').select('*').eq('id', id).eq('project_id', project).single()
//   2. runs:    from('bridge_runs').select('*').eq('story_id', id).order('started_at', {ascending:false}).limit(50)

// Runs chain
const mockRunsLimit  = jest.fn()
const mockRunsOrder  = jest.fn(() => ({ limit: mockRunsLimit }))
const mockRunsEq     = jest.fn(() => ({ order: mockRunsOrder }))
const mockRunsSelect = jest.fn(() => ({ eq: mockRunsEq }))

// Story chain
const mockStorySingle  = jest.fn()
const mockStoryEqProject = jest.fn(() => ({ single: mockStorySingle }))
const mockStoryEqId    = jest.fn(() => ({ eq: mockStoryEqProject }))
const mockStorySelect  = jest.fn(() => ({ eq: mockStoryEqId }))

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

  // Re-establish chains
  mockStoryEqProject.mockReturnValue({ single: mockStorySingle })
  mockStoryEqId.mockReturnValue({ eq: mockStoryEqProject })
  mockStorySelect.mockReturnValue({ eq: mockStoryEqId })

  mockRunsEq.mockReturnValue({ order: mockRunsOrder })
  mockRunsOrder.mockReturnValue({ limit: mockRunsLimit })
  mockRunsSelect.mockReturnValue({ eq: mockRunsEq })

  // Return the right chain based on table name
  mockFrom.mockImplementation((table: string) => {
    if (table === 'bridge_stories') {
      return { select: mockStorySelect }
    }
    if (table === 'bridge_runs') {
      return { select: mockRunsSelect }
    }
    return {}
  })
})

// ─── Auth helpers ─────────────────────────────────────────────────────────────

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
  const url = new URL('http://localhost/api/stories/STORY-1.1')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return { nextUrl: url }
}

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/stories/[id]/route'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_STORY = {
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
}

const MOCK_RUNS = [
  {
    id: 'run-1',
    story_id: 'STORY-1.1',
    project_id: 'kira-dashboard',
    step: 'IMPLEMENT',
    worker: 'kimi',
    model: 'kimi',
    status: 'SUCCESS',
    attempt_number: 1,
    started_at: '2026-02-26T10:00:00Z',
    ended_at: '2026-02-26T10:30:00Z',
    duration_ms: 1800000,
    error_message: null,
    synced_at: '2026-02-26T11:00:00Z',
  },
]

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/stories/[id]', () => {

  // ── Auth required ──────────────────────────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    denyAuth()

    const req = makeRequest()
    const params = Promise.resolve({ id: 'STORY-1.1' })
    const res = await GET(req as any, { params })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-3: Returns story details + runs ────────────────────────────────────

  it('returns story details with runs for authenticated user (AC-3)', async () => {
    allowAuth()
    mockStorySingle.mockResolvedValueOnce({ data: MOCK_STORY, error: null })
    mockRunsLimit.mockResolvedValueOnce({ data: MOCK_RUNS, error: null })

    const req = makeRequest({ project: 'kira-dashboard' })
    const params = Promise.resolve({ id: 'STORY-1.1' })
    const res = await GET(req as any, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({
      id: 'STORY-1.1',
      epic_id: 'EPIC-1',
      title: 'Story One',
      status: 'DONE',
    })
    expect(Array.isArray(json.runs)).toBe(true)
    expect(json.runs).toHaveLength(1)
    expect(json.runs[0]).toMatchObject({ id: 'run-1', step: 'IMPLEMENT' })
  })

  it('queries story by id and project', async () => {
    allowAuth()
    mockStorySingle.mockResolvedValueOnce({ data: MOCK_STORY, error: null })
    mockRunsLimit.mockResolvedValueOnce({ data: [], error: null })

    const req = makeRequest({ project: 'my-project' })
    const params = Promise.resolve({ id: 'STORY-1.1' })
    await GET(req as any, { params })

    expect(mockStoryEqId).toHaveBeenCalledWith('id', 'STORY-1.1')
    expect(mockStoryEqProject).toHaveBeenCalledWith('project_id', 'my-project')
  })

  it('queries runs for the story', async () => {
    allowAuth()
    mockStorySingle.mockResolvedValueOnce({ data: MOCK_STORY, error: null })
    mockRunsLimit.mockResolvedValueOnce({ data: MOCK_RUNS, error: null })

    const req = makeRequest()
    const params = Promise.resolve({ id: 'STORY-1.1' })
    await GET(req as any, { params })

    expect(mockRunsEq).toHaveBeenCalledWith('story_id', 'STORY-1.1')
  })

  // ── 404 handling ──────────────────────────────────────────────────────────

  it('returns 404 when story not found', async () => {
    allowAuth()
    mockStorySingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    })

    const req = makeRequest()
    const params = Promise.resolve({ id: 'STORY-99.99' })
    const res = await GET(req as any, { params })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── EC-1: null depends_on / blocks → empty arrays ─────────────────────────

  it('maps null depends_on / blocks to empty arrays (EC-1)', async () => {
    allowAuth()
    const storyWithNulls = {
      ...MOCK_STORY,
      depends_on: null,
      blocks: null,
    }
    mockStorySingle.mockResolvedValueOnce({ data: storyWithNulls, error: null })
    mockRunsLimit.mockResolvedValueOnce({ data: [], error: null })

    const req = makeRequest()
    const params = Promise.resolve({ id: 'STORY-1.1' })
    const res = await GET(req as any, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.depends_on).toEqual([])
    expect(json.blocks).toEqual([])
  })

  // ── Runs fallback to empty array ──────────────────────────────────────────

  it('returns empty runs array when runs query returns null', async () => {
    allowAuth()
    mockStorySingle.mockResolvedValueOnce({ data: MOCK_STORY, error: null })
    mockRunsLimit.mockResolvedValueOnce({ data: null, error: null })

    const req = makeRequest()
    const params = Promise.resolve({ id: 'STORY-1.1' })
    const res = await GET(req as any, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.runs).toEqual([])
  })
})
