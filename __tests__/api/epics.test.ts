/**
 * __tests__/api/epics.test.ts
 * STORY-12.8 — Integration tests for GET /api/epics endpoint
 * TDD: written before implementation (RED phase).
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

// ─── Mock requireRole ─────────────────────────────────────────────────────────

const mockRequireAuth = jest.fn()
jest.mock('@/lib/auth/requireRole', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}))

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockEq = jest.fn()
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/epics/route'

// ─── Sample fixture data ──────────────────────────────────────────────────────

const MOCK_EPICS = [
  {
    project_id: 'kira-dashboard',
    id: 'EPIC-1',
    title: 'Epic One',
    file_path: 'epics/EPIC-1.md',
    status: 'DONE',
    total_stories: 10,
    done_stories: 10,
    created_at: '2026-01-01T00:00:00Z',
    synced_at: '2026-02-26T10:00:00Z',
  },
  {
    project_id: 'kira-dashboard',
    id: 'EPIC-2',
    title: 'Epic Two',
    file_path: 'epics/EPIC-2.md',
    status: 'IN_PROGRESS',
    total_stories: 8,
    done_stories: 6,
    created_at: '2026-01-02T00:00:00Z',
    synced_at: '2026-02-26T10:00:00Z',
  },
  {
    project_id: 'kira-dashboard',
    id: 'EPIC-10',
    title: 'Epic Ten',
    file_path: 'epics/EPIC-10.md',
    status: 'READY',
    total_stories: 5,
    done_stories: 0,
    created_at: '2026-01-10T00:00:00Z',
    synced_at: '2026-02-26T10:00:00Z',
  },
  {
    project_id: 'kira-dashboard',
    id: 'EPIC-14',
    title: 'Epic Fourteen',
    file_path: 'epics/EPIC-14.md',
    status: 'DRAFT',
    total_stories: 0,
    done_stories: 0,
    created_at: '2026-01-14T00:00:00Z',
    synced_at: '2026-02-26T10:00:00Z',
  },
]

// Helpers for auth
function allowAuth() {
  mockRequireAuth.mockResolvedValue({ user: { id: 'user-id' }, role: 'USER' })
}

function denyUnauth() {
  mockRequireAuth.mockResolvedValue(
    MockNextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
  )
}

// Helper to build a mock NextRequest with nextUrl
function mockEpicsRequest(project: string = 'kira-dashboard'): any {
  const url = new URL(`http://localhost/api/epics?project=${project}`)
  return {
    nextUrl: url,
    url: url.toString(),
    method: 'GET',
  }
}

// Helper for request without project param
function mockEpicsRequestNoParams(): any {
  const url = new URL('http://localhost/api/epics')
  return {
    nextUrl: url,
    url: url.toString(),
    method: 'GET',
  }
}

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/epics', () => {
  // ── AC-4: Auth required ────────────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-4)', async () => {
    denyUnauth()
    const req = mockEpicsRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-1: Returns epics from Supabase ──────────────────────────────────────

  it('returns list of epics with progress for authenticated user (AC-1)', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_EPICS, error: null })

    const req = mockEpicsRequest()
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.length).toBe(4)

    // Check structure
    const epic = json.data[0]
    expect(epic).toHaveProperty('id')
    expect(epic).toHaveProperty('title')
    expect(epic).toHaveProperty('status')
    expect(epic).toHaveProperty('total_stories')
    expect(epic).toHaveProperty('done_stories')
    expect(epic).toHaveProperty('progress')
  })

  // ── AC-2: Progress calculated as % ─────────────────────────────────────────

  it('calculates progress as percentage (AC-2)', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_EPICS, error: null })

    const req = mockEpicsRequest()
    const res = await GET(req)
    const json = await res.json()

    // EPIC-1: 10/10 = 100%
    const epic1 = json.data.find((e: any) => e.id === 'EPIC-1')
    expect(epic1.progress).toBe(100)

    // EPIC-2: 6/8 = 75%
    const epic2 = json.data.find((e: any) => e.id === 'EPIC-2')
    expect(epic2.progress).toBe(75)

    // EPIC-10: 0/5 = 0%
    const epic10 = json.data.find((e: any) => e.id === 'EPIC-10')
    expect(epic10.progress).toBe(0)
  })

  // ── AC-3: Sorting numerically (not lexically) ──────────────────────────────

  it('sorts epics numerically by EPIC number (AC-3)', async () => {
    allowAuth()
    // Return in wrong order to test sorting
    const wrongOrder = [...MOCK_EPICS].reverse() // 14, 10, 2, 1
    mockEq.mockResolvedValueOnce({ data: wrongOrder, error: null })

    const req = mockEpicsRequest()
    const res = await GET(req)
    const json = await res.json()

    const ids = json.data.map((e: any) => e.id)
    expect(ids).toEqual(['EPIC-1', 'EPIC-2', 'EPIC-10', 'EPIC-14'])
  })

  // ── EC-1: Epic with 0 stories (avoid division by zero) ─────────────────────

  it('returns progress 0 for epics with total_stories = 0 (EC-1)', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_EPICS, error: null })

    const req = mockEpicsRequest()
    const res = await GET(req)
    const json = await res.json()

    const epic14 = json.data.find((e: any) => e.id === 'EPIC-14')
    expect(epic14.progress).toBe(0)
    expect(epic14.total_stories).toBe(0)
  })

  // ── Error handling ─────────────────────────────────────────────────────────

  it('returns 500 when Supabase query fails', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Database connection failed' } 
    })

    const req = mockEpicsRequest()
    const res = await GET(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toHaveProperty('error')
    expect(json.error).toContain('Database connection failed')
  })

  it('returns empty array when no epics found', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: [], error: null })

    const req = mockEpicsRequest('nonexistent-project')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual([])
  })

  // ── Query param handling ───────────────────────────────────────────────────

  it('uses project query parameter (defaults to kira-dashboard)', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_EPICS, error: null })

    const req = mockEpicsRequest('my-project')
    await GET(req)

    // Verify eq was called with correct project
    expect(mockEq).toHaveBeenCalledWith('project_id', 'my-project')
  })

  it('uses default project when no query param provided', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_EPICS, error: null })

    const req = mockEpicsRequestNoParams()
    await GET(req)

    // Should use default 'kira-dashboard'
    expect(mockEq).toHaveBeenCalledWith('project_id', 'kira-dashboard')
  })

  // ── Cache headers ──────────────────────────────────────────────────────────

  it('includes no-store cache header', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_EPICS, error: null })

    const req = mockEpicsRequest()
    const res = await GET(req)

    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
