/**
 * __tests__/api/nightclaw/skills-diff.test.ts
 * STORY-12.10 — Integration tests for GET /api/nightclaw/skills-diff (Supabase migration)
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

const mockEq = jest.fn()
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET } from '@/app/api/nightclaw/skills-diff/route'

// ─── Sample fixture data ──────────────────────────────────────────────────────

const MOCK_SKILLS_DIFF = [
  {
    id: 'uuid-1',
    run_date: '2026-02-26',
    skill_name: 'kira-orchestrator',
    skill_path: 'skills/kira-orchestrator/SKILL.md',
    diff_content: '--- a/SKILL.md\n+++ b/SKILL.md\n@@ -1 +1 @@\n-old\n+new',
    lines_added: 1,
    lines_removed: 1,
    modified_at: '2026-02-26T02:15:00+00:00',
    created_at: '2026-02-26T02:16:00Z',
  },
  {
    id: 'uuid-2',
    run_date: '2026-02-26',
    skill_name: 'kira-implementor',
    skill_path: 'skills/kira-implementor/SKILL.md',
    diff_content: '--- a/SKILL.md\n+++ b/SKILL.md\n@@ -5 +5 @@\n-removed line\n+added line A\n+added line B',
    lines_added: 2,
    lines_removed: 1,
    modified_at: '2026-02-26T02:18:00+00:00',
    created_at: '2026-02-26T02:19:00Z',
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

function mockSkillsDiffRequest(params: string = ''): any {
  const url = new URL(`http://localhost/api/nightclaw/skills-diff${params}`)
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

describe('GET /api/nightclaw/skills-diff', () => {
  // ── AC-6: Auth required ─────────────────────────────────────────────────────

  it('returns 401 when unauthenticated (AC-6)', async () => {
    denyAuth()
    const res = await GET(mockSkillsDiffRequest('?date=2026-02-26'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toHaveProperty('error')
  })

  // ── AC-5: Returns skills diff list from Supabase ─────────────────────────────

  it('returns skills diff for given date from Supabase (AC-5)', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_SKILLS_DIFF, error: null })

    const res = await GET(mockSkillsDiffRequest('?date=2026-02-26'))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toHaveProperty('skills')
    expect(Array.isArray(json.skills)).toBe(true)
    expect(json.skills.length).toBe(2)
    expect(json).toHaveProperty('total_modified', 2)
  })

  it('queries nightclaw_skills_diff with run_date eq (AC-5)', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_SKILLS_DIFF, error: null })

    await GET(mockSkillsDiffRequest('?date=2026-02-26'))

    expect(mockFrom).toHaveBeenCalledWith('nightclaw_skills_diff')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('run_date', '2026-02-26')
  })

  it('each skill entry has required fields from Supabase schema (AC-5)', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_SKILLS_DIFF, error: null })

    const res = await GET(mockSkillsDiffRequest('?date=2026-02-26'))
    const json = await res.json()

    for (const skill of json.skills) {
      expect(skill).toHaveProperty('skill_name')
      expect(skill).toHaveProperty('skill_path')
      expect(skill).toHaveProperty('diff_content')
      expect(skill).toHaveProperty('lines_added')
      expect(skill).toHaveProperty('lines_removed')
    }
  })

  // ── Default date (today) ────────────────────────────────────────────────────

  it('defaults to today when no date param provided (AC-5)', async () => {
    allowAuth()
    const today = new Date().toISOString().split('T')[0]
    mockEq.mockResolvedValueOnce({ data: [], error: null })

    await GET(mockSkillsDiffRequest())

    expect(mockEq).toHaveBeenCalledWith('run_date', today)
  })

  // ── Empty state ─────────────────────────────────────────────────────────────

  it('returns empty skills array when no data for date (EC-1)', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: [], error: null })

    const res = await GET(mockSkillsDiffRequest('?date=2026-01-01'))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.skills).toEqual([])
    expect(json.total_modified).toBe(0)
  })

  it('returns empty skills array when data is null', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: null, error: null })

    const res = await GET(mockSkillsDiffRequest('?date=2026-01-01'))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.skills).toEqual([])
    expect(json.total_modified).toBe(0)
  })

  // ── Cache-Control header ────────────────────────────────────────────────────

  it('includes Cache-Control: no-store header', async () => {
    allowAuth()
    mockEq.mockResolvedValueOnce({ data: MOCK_SKILLS_DIFF, error: null })

    const res = await GET(mockSkillsDiffRequest('?date=2026-02-26'))
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
