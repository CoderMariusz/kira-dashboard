/**
 * __tests__/api/patterns-supabase.test.ts
 * STORY-12.11 — Integration tests for GET/POST /api/patterns (Supabase migration).
 * TDD: written before implementation (RED phase).
 *
 * Test matrix:
 *  AC-1: GET returns { patterns, lessons, meta } from Supabase
 *  AC-2: Filtering by type and search works
 *  AC-3: POST /api/patterns inserts to kira_patterns
 *  AC-4: POST /api/lessons inserts to kira_lessons
 *  AC-5: Auth + RBAC (401/403)
 *  AC-6: Response compatible with frontend types
 *  EC-1: Empty tables → 200 { patterns: [], lessons: [] }
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
  NextRequest: class extends Request {},
}))

// ─── Mock requireRole ─────────────────────────────────────────────────────────

const mockRequireAuth = jest.fn()
const mockRequireAdmin = jest.fn()
jest.mock('@/lib/auth/requireRole', () => ({
  requireAuth:  (...args: any[]) => mockRequireAuth(...args),
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// ─── Supabase mock builder ─────────────────────────────────────────────────────

// For GET: patterns query chain
//   from('kira_patterns')
//     .select('*').eq('project_id', ...).eq('type', ...)?  .or(...)? .order('created_at', ...) → awaited
//
// For GET: lessons query chain
//   from('kira_lessons')
//     .select('*').eq('project_id', ...).or(...)? .order('date', ...) → awaited

const mockPatternsInsert  = jest.fn()
const mockPatternsOrder   = jest.fn()
const mockPatternsOr      = jest.fn()
const mockPatternsEqType  = jest.fn()
const mockPatternsEqProj  = jest.fn()
const mockPatternsSelect  = jest.fn()

const mockLessonsLimit    = jest.fn()
const mockLessonsSingle   = jest.fn()
const mockLessonsOrderId  = jest.fn()
const mockLessonsLike     = jest.fn()
const mockLessonsInsert   = jest.fn()
const mockLessonsOrder    = jest.fn()
const mockLessonsOr       = jest.fn()
const mockLessonsEqProj   = jest.fn()
const mockLessonsSelect   = jest.fn()

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ from: mockFrom })),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET, POST } from '@/app/api/patterns/route'
import { POST as postLessons } from '@/app/api/lessons/route'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Fixture data ──────────────────────────────────────────────────────────────

const PATTERN_ROWS = [
  {
    id: 'pat-abc123',
    project_id: 'kira-dashboard',
    source: 'patterns.md',
    type: 'PATTERN',
    category: 'Pipeline',
    date: '2026-02-17',
    model: 'GLM-5',
    domain: 'frontend',
    text: 'Parallel execution pattern works',
    tags: ['glm-5', 'frontend', 'pipeline'],
    related_stories: [],
    occurrences: 1,
    created_at: '2026-02-17T10:00:00Z',
  },
  {
    id: 'pat-def456',
    project_id: 'kira-dashboard',
    source: 'anti-patterns.md',
    type: 'ANTI_PATTERN',
    category: 'Pipeline',
    date: '2026-02-16',
    model: null,
    domain: null,
    text: 'NIE używaj GLM na complex backend tasks',
    tags: ['pipeline'],
    related_stories: [],
    occurrences: 1,
    created_at: '2026-02-16T10:00:00Z',
  },
]

const LESSON_ROWS = [
  {
    id: 'OPS-001',
    project_id: 'kira-dashboard',
    title: 'REVIEW severity rules',
    severity: 'MEDIUM',
    description: 'Review agent was not enforcing severity correctly',
    root_cause: 'Missing validation logic',
    fix: 'Added severity enforcement in review step',
    story_id: 'STORY-12.6',
    tags: ['review', 'pipeline'],
    date: '2026-02-26',
    created_at: '2026-02-26T10:00:00Z',
  },
]

// ─── Helper: success auth mocks ───────────────────────────────────────────────

function mockAuthSuccess() {
  mockRequireAuth.mockResolvedValue({ success: true, user: { id: 'user-1' } })
}

function mockAdminSuccess() {
  mockRequireAdmin.mockResolvedValue({ success: true, user: { id: 'admin-1' } })
}

function mockAuth401() {
  const res = new MockNextResponse(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
  mockRequireAuth.mockResolvedValue(res)
}

function mockAdmin401() {
  const res = new MockNextResponse(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
  mockRequireAdmin.mockResolvedValue(res)
}

function mockAdmin403() {
  const res = new MockNextResponse(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
  mockRequireAdmin.mockResolvedValue(res)
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── GET /api/patterns (Supabase) ─────────────────────────────────────────────

describe('GET /api/patterns — Supabase (STORY-12.11)', () => {

  function setupMockFrom(patternResult: any, lessonResult: any) {
    // Patterns chain: select → eq(project_id) → [eq(type)] → [or(search)] → order → resolved
    mockPatternsOrder.mockResolvedValue({ data: patternResult.data, error: patternResult.error })
    mockPatternsOr.mockReturnValue({ order: mockPatternsOrder })
    mockPatternsEqType.mockReturnValue({ or: mockPatternsOr, order: mockPatternsOrder })
    mockPatternsEqProj.mockReturnValue({ eq: mockPatternsEqType, or: mockPatternsOr, order: mockPatternsOrder })
    mockPatternsSelect.mockReturnValue({ eq: mockPatternsEqProj })

    // Lessons chain: select → eq(project_id) → [or(search)] → order → resolved
    mockLessonsOrder.mockResolvedValue({ data: lessonResult.data, error: lessonResult.error })
    mockLessonsOr.mockReturnValue({ order: mockLessonsOrder })
    mockLessonsEqProj.mockReturnValue({ or: mockLessonsOr, order: mockLessonsOrder })
    mockLessonsSelect.mockReturnValue({ eq: mockLessonsEqProj })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'kira_patterns') return { select: mockPatternsSelect, insert: mockPatternsInsert }
      if (table === 'kira_lessons')  return { select: mockLessonsSelect, insert: mockLessonsInsert }
      return {}
    })
  }

  // ── AC-5: 401 without auth ────────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-5)', async () => {
    mockAuth401()
    const res = await GET(mockRequest())
    expect(res.status).toBe(401)
  })

  // ── AC-1: Happy path — both tables populated ──────────────────────────────

  it('returns 200 with { patterns, lessons, meta } from Supabase (AC-1)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: PATTERN_ROWS, error: null },
      { data: LESSON_ROWS, error: null }
    )

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('patterns')
    expect(json).toHaveProperty('lessons')
    expect(json).toHaveProperty('meta')
    expect(Array.isArray(json.patterns)).toBe(true)
    expect(Array.isArray(json.lessons)).toBe(true)
  })

  it('meta has source=supabase (AC-1)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: PATTERN_ROWS, error: null },
      { data: LESSON_ROWS, error: null }
    )

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.meta.source).toBe('supabase')
    expect(json.meta.total_patterns).toBe(PATTERN_ROWS.length)
    expect(json.meta.total_lessons).toBe(LESSON_ROWS.length)
  })

  // ── AC-6: Response compatible with frontend types ─────────────────────────

  it('returns pattern rows directly from Supabase (AC-6)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: PATTERN_ROWS, error: null },
      { data: [], error: null }
    )

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.patterns).toHaveLength(2)
    expect(json.patterns[0].id).toBe('pat-abc123')
    expect(json.patterns[0].type).toBe('PATTERN')
    expect(json.patterns[1].type).toBe('ANTI_PATTERN')
  })

  it('returns lesson rows directly from Supabase (AC-6)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: [], error: null },
      { data: LESSON_ROWS, error: null }
    )

    const res = await GET(mockRequest())
    const json = await res.json()

    expect(json.lessons).toHaveLength(1)
    expect(json.lessons[0].id).toBe('OPS-001')
    expect(json.lessons[0].title).toBe('REVIEW severity rules')
  })

  // ── AC-2: Filtering by type ────────────────────────────────────────────────

  it('calls eq(type) when type= query param is provided (AC-2)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: [PATTERN_ROWS[0]], error: null },
      { data: [], error: null }
    )

    const res = await GET(mockRequest({ url: 'http://localhost/api/patterns?type=PATTERN' }))
    expect(res.status).toBe(200)

    // eq(type) should have been called with 'type', 'PATTERN'
    expect(mockPatternsEqType).toHaveBeenCalledWith('type', 'PATTERN')
  })

  // ── AC-2: Search filtering ─────────────────────────────────────────────────

  it('calls or(ILIKE) when search= query param is provided (AC-2)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: [PATTERN_ROWS[0]], error: null },
      { data: [], error: null }
    )

    const res = await GET(mockRequest({ url: 'http://localhost/api/patterns?search=timeout' }))
    expect(res.status).toBe(200)

    // or(ILIKE) should have been called for patterns
    expect(mockPatternsOr).toHaveBeenCalledWith(
      expect.stringContaining('timeout')
    )
  })

  // ── EC-1: Empty tables ─────────────────────────────────────────────────────

  it('returns 200 with empty arrays when tables are empty (EC-1)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: [], error: null },
      { data: [], error: null }
    )

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.patterns).toHaveLength(0)
    expect(json.lessons).toHaveLength(0)
    expect(json.meta.total_patterns).toBe(0)
    expect(json.meta.total_lessons).toBe(0)
  })

  it('handles null data from Supabase gracefully (EC-1)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: null, error: null },
      { data: null, error: null }
    )

    const res = await GET(mockRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.patterns).toEqual([])
    expect(json.lessons).toEqual([])
  })

  // ── Cache-Control header ───────────────────────────────────────────────────

  it('sets Cache-Control: no-store header (AC-1)', async () => {
    mockAuthSuccess()
    setupMockFrom(
      { data: PATTERN_ROWS, error: null },
      { data: LESSON_ROWS, error: null }
    )

    const res = await GET(mockRequest())
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})

// ─── POST /api/patterns (Supabase) ────────────────────────────────────────────

describe('POST /api/patterns — Supabase (STORY-12.11)', () => {

  // ── AC-5: 401 without auth ────────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-5)', async () => {
    mockAdmin401()
    const res = await POST(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', category: 'Test', text: 'Test pattern' },
    }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin (AC-5)', async () => {
    mockAdmin403()
    const res = await POST(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', category: 'Test', text: 'Test pattern' },
    }))
    expect(res.status).toBe(403)
  })

  // ── AC-3: POST inserts to kira_patterns ───────────────────────────────────

  it('inserts pattern to kira_patterns and returns 201 with id (AC-3)', async () => {
    mockAdminSuccess()
    mockPatternsInsert.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue({ insert: mockPatternsInsert })

    const res = await POST(mockRequest({
      method: 'POST',
      body: {
        type: 'PATTERN',
        category: 'Pipeline',
        text: 'Parallel execution pattern works',
        model: 'GLM-5',
        domain: 'frontend',
        tags: ['glm-5', 'pipeline'],
      },
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.id).toBeTruthy()

    // Verify insert was called
    expect(mockPatternsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PATTERN',
        category: 'Pipeline',
        text: 'Parallel execution pattern works',
        project_id: 'kira-dashboard',
      })
    )
  })

  it('inserts ANTI_PATTERN with correct source (AC-3)', async () => {
    mockAdminSuccess()
    mockPatternsInsert.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue({ insert: mockPatternsInsert })

    const res = await POST(mockRequest({
      method: 'POST',
      body: {
        type: 'ANTI_PATTERN',
        category: 'Pipeline',
        text: 'NIE używaj GLM na complex backend tasks',
      },
    }))

    expect(res.status).toBe(201)
    expect(mockPatternsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ANTI_PATTERN',
        source: 'anti-patterns.md',
      })
    )
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  it('returns 400 when type is missing (validation)', async () => {
    mockAdminSuccess()
    const res = await POST(mockRequest({
      method: 'POST',
      body: { category: 'Test', text: 'Test pattern' },
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when category is missing (validation)', async () => {
    mockAdminSuccess()
    const res = await POST(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', text: 'Test pattern' },
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when text is missing (validation)', async () => {
    mockAdminSuccess()
    const res = await POST(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', category: 'Test' },
    }))
    expect(res.status).toBe(400)
  })

  // ── Cache-Control header ───────────────────────────────────────────────────

  it('sets Cache-Control: no-store header on 201 (AC-1)', async () => {
    mockAdminSuccess()
    mockPatternsInsert.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue({ insert: mockPatternsInsert })

    const res = await POST(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', category: 'Test', text: 'Test pattern' },
    }))

    expect(res.status).toBe(201)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  // ── EC-2: Supabase error → 500 ────────────────────────────────────────────

  it('returns 500 on Supabase insert error (EC-2)', async () => {
    mockAdminSuccess()
    mockPatternsInsert.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue({ insert: mockPatternsInsert })

    const res = await POST(mockRequest({
      method: 'POST',
      body: { type: 'PATTERN', category: 'Test', text: 'Test pattern' },
    }))

    expect(res.status).toBe(500)
  })
})

// ─── POST /api/lessons (Supabase) ────────────────────────────────────────────

describe('POST /api/lessons — Supabase (STORY-12.11)', () => {

  // ── AC-5: 401/403 auth checks ─────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-5)', async () => {
    mockAdmin401()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: { title: 'Test lesson', description: 'desc' },
    }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin (AC-5)', async () => {
    mockAdmin403()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: { title: 'Test lesson', description: 'desc' },
    }))
    expect(res.status).toBe(403)
  })

  // ── AC-4: POST inserts to kira_lessons ────────────────────────────────────

  it('auto-generates OPS-XXX id and inserts to kira_lessons (AC-4)', async () => {
    mockAdminSuccess()

    // Mock the id-generation query (get last OPS-xxx id)
    mockLessonsSingle.mockResolvedValue({ data: { id: 'OPS-005' }, error: null })
    mockLessonsLimit.mockReturnValue({ single: mockLessonsSingle })
    mockLessonsOrderId.mockReturnValue({ limit: mockLessonsLimit })
    mockLessonsLike.mockReturnValue({ order: mockLessonsOrderId })
    mockLessonsSelect.mockReturnValue({ like: mockLessonsLike })

    // Mock the insert
    mockLessonsInsert.mockResolvedValue({ data: null, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'kira_lessons') {
        return {
          select: mockLessonsSelect,
          insert: mockLessonsInsert,
        }
      }
      return {}
    })

    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        title: 'New lesson about Supabase',
        severity: 'HIGH',
        description: 'Full description of the lesson',
        root_cause: 'Root cause analysis',
        fix: 'The fix applied',
        story_id: 'STORY-12.11',
        tags: ['supabase', 'migration'],
      },
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.id).toBe('OPS-006') // lastNum=5 → next is 6

    // Verify insert was called with correct fields
    expect(mockLessonsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'OPS-006',
        project_id: 'kira-dashboard',
        title: 'New lesson about Supabase',
        description: 'Full description of the lesson',
      })
    )
  })

  it('starts from OPS-001 when no existing lessons (AC-4)', async () => {
    mockAdminSuccess()

    // No existing OPS-xxx lessons
    mockLessonsSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockLessonsLimit.mockReturnValue({ single: mockLessonsSingle })
    mockLessonsOrderId.mockReturnValue({ limit: mockLessonsLimit })
    mockLessonsLike.mockReturnValue({ order: mockLessonsOrderId })
    mockLessonsSelect.mockReturnValue({ like: mockLessonsLike })

    mockLessonsInsert.mockResolvedValue({ data: null, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'kira_lessons') {
        return {
          select: mockLessonsSelect,
          insert: mockLessonsInsert,
        }
      }
      return {}
    })

    const res = await postLessons(mockRequest({
      method: 'POST',
      body: {
        title: 'First lesson',
        description: 'Description of first lesson',
      },
    }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe('OPS-001')
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  it('returns 400 when title is missing (validation)', async () => {
    mockAdminSuccess()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: { description: 'Some description' },
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when description is missing (validation)', async () => {
    mockAdminSuccess()
    const res = await postLessons(mockRequest({
      method: 'POST',
      body: { title: 'Some title' },
    }))
    expect(res.status).toBe(400)
  })

  // ── Cache-Control header ───────────────────────────────────────────────────

  it('sets Cache-Control: no-store header on 201 (AC-1)', async () => {
    mockAdminSuccess()

    mockLessonsSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockLessonsLimit.mockReturnValue({ single: mockLessonsSingle })
    mockLessonsOrderId.mockReturnValue({ limit: mockLessonsLimit })
    mockLessonsLike.mockReturnValue({ order: mockLessonsOrderId })
    mockLessonsSelect.mockReturnValue({ like: mockLessonsLike })
    mockLessonsInsert.mockResolvedValue({ data: null, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'kira_lessons') {
        return { select: mockLessonsSelect, insert: mockLessonsInsert }
      }
      return {}
    })

    const res = await postLessons(mockRequest({
      method: 'POST',
      body: { title: 'Test', description: 'Test desc' },
    }))

    expect(res.status).toBe(201)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  // ── EC-2: Supabase error → 500 ────────────────────────────────────────────

  it('returns 500 on Supabase insert error (EC-2)', async () => {
    mockAdminSuccess()

    mockLessonsSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockLessonsLimit.mockReturnValue({ single: mockLessonsSingle })
    mockLessonsOrderId.mockReturnValue({ limit: mockLessonsLimit })
    mockLessonsLike.mockReturnValue({ order: mockLessonsOrderId })
    mockLessonsSelect.mockReturnValue({ like: mockLessonsLike })
    mockLessonsInsert.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'kira_lessons') {
        return { select: mockLessonsSelect, insert: mockLessonsInsert }
      }
      return {}
    })

    const res = await postLessons(mockRequest({
      method: 'POST',
      body: { title: 'Test', description: 'Test desc' },
    }))

    expect(res.status).toBe(500)
  })
})
