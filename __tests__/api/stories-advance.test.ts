/**
 * __tests__/api/stories-advance.test.ts
 * STORY-12.9 — Integration tests for POST /api/stories/[id]/advance
 * TDD: written before implementation (RED phase).
 *
 * Test matrix:
 *  TC-1  401 — no session (unauthenticated)
 *  TC-2  403 — not ADMIN
 *  TC-3  400 — invalid story ID format
 *  TC-4  400 — missing/invalid body (no status)
 *  TC-5  400 — invalid status value
 *  TC-6  200 — local mode (BRIDGE_DIR set) → execSync path → { ok: true, mode: 'local' }
 *  TC-7  200 — Vercel mode (no BRIDGE_DIR) → Supabase queue → { ok: true, mode: 'queued' }
 *  TC-8  500 — Supabase insert error in queue mode
 *  TC-9  Cache-Control: no-store header present
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

jest.mock('next/server', () => ({ NextResponse: MockNextResponse }))

// ─── Mock Supabase server ─────────────────────────────────────────────────────

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

// ─── Mock requireRole ─────────────────────────────────────────────────────────

const mockRequireAdmin = jest.fn()
jest.mock('@/lib/auth/requireRole', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// ─── Mock bridge-cli (for local mode) ────────────────────────────────────────

const mockRunBridgeCLI = jest.fn()
jest.mock('@/lib/bridge-cli', () => ({
  runBridgeCLI: (...args: any[]) => mockRunBridgeCLI(...args),
  STORY_ID_REGEX: /^STORY-\d+\.\d+$/,
  ALLOWED_STATUSES: ['REVIEW', 'DONE', 'REFACTOR'],
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST } from '@/app/api/stories/[id]/advance/route'
import { mockRequest } from '@/__tests__/helpers/fetch'
import { mockAdminSession, mockNoSession, mockUserSession } from '@/__tests__/helpers/auth'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allowAdmin() {
  mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-user-id' }, role: 'ADMIN' })
}

function denyUnauth() {
  mockRequireAdmin.mockResolvedValue(
    MockNextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
  )
}

function denyForbidden() {
  mockRequireAdmin.mockResolvedValue(
    MockNextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  )
}

function makeParams(id = 'STORY-7.1') {
  return Promise.resolve({ id })
}

// ─── Supabase mock for queue mode ─────────────────────────────────────────────

let mockSupabaseInsert: jest.Mock
let mockSupabaseFrom: jest.Mock

function setupSupabaseMock(insertResult: { error: any }) {
  mockSupabaseInsert = jest.fn().mockResolvedValue(insertResult)
  const mockInsertChain = { insert: mockSupabaseInsert }
  mockSupabaseFrom = jest.fn().mockReturnValue(mockInsertChain)

  const { createClient } = jest.requireMock('@/lib/supabase/server') as { createClient: jest.Mock }
  createClient.mockResolvedValue({ from: mockSupabaseFrom })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/stories/[id]/advance', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env['BRIDGE_DIR']
    // Default: successful Supabase insert
    setupSupabaseMock({ error: null })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  // TC-1: 401 when unauthenticated
  it('TC-1: returns 401 when unauthenticated', async () => {
    denyUnauth()
    const req = mockRequest({ method: 'POST', body: { status: 'REVIEW' } })
    const res = await POST(req as any, { params: makeParams() })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-2: 403 when not ADMIN
  it('TC-2: returns 403 when not ADMIN', async () => {
    denyForbidden()
    const req = mockRequest({ method: 'POST', body: { status: 'REVIEW' } })
    const res = await POST(req as any, { params: makeParams() })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-3: 400 for invalid story ID format
  it('TC-3: returns 400 for invalid story ID format', async () => {
    allowAdmin()
    const req = mockRequest({ method: 'POST', body: { status: 'REVIEW' } })
    const res = await POST(req as any, { params: Promise.resolve({ id: 'not-a-story' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toMatch(/story/i)
  })

  // TC-4: 400 for missing status
  it('TC-4: returns 400 when body has no status', async () => {
    allowAdmin()
    const req = mockRequest({ method: 'POST', body: {} })
    const res = await POST(req as any, { params: makeParams() })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  // TC-5: 400 for invalid status value
  it('TC-5: returns 400 for invalid status value', async () => {
    allowAdmin()
    const req = mockRequest({ method: 'POST', body: { status: 'INVALID_STATUS' } })
    const res = await POST(req as any, { params: makeParams() })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  // TC-6: local mode (BRIDGE_DIR set) → runBridgeCLI path
  it('TC-6: uses local bridge CLI when BRIDGE_DIR is set', async () => {
    allowAdmin()
    process.env['BRIDGE_DIR'] = '/Users/mariuszkrawczyk/codermariusz/kira'
    mockRunBridgeCLI.mockResolvedValue({ ok: true, output: 'Story advanced' })

    const req = mockRequest({ method: 'POST', body: { status: 'REVIEW' } })
    const res = await POST(req as any, { params: makeParams('STORY-7.1') })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.mode).toBe('local')
    expect(mockRunBridgeCLI).toHaveBeenCalled()
  })

  // TC-7: queue mode (no BRIDGE_DIR) → Supabase insert
  it('TC-7: uses Supabase queue when BRIDGE_DIR is not set', async () => {
    allowAdmin()
    setupSupabaseMock({ error: null })

    const req = mockRequest({ method: 'POST', body: { status: 'REVIEW' } })
    const res = await POST(req as any, { params: makeParams('STORY-7.1') })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.mode).toBe('queued')
    expect(body.message).toMatch(/bridge/i)
    // Bridge CLI should NOT be called in queue mode
    expect(mockRunBridgeCLI).not.toHaveBeenCalled()
    // Supabase insert should be called
    expect(mockSupabaseFrom).toHaveBeenCalledWith('bridge_commands')
    expect(mockSupabaseInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        story_id: 'STORY-7.1',
        command: 'advance',
        payload: expect.objectContaining({ status: 'REVIEW' }),
      })
    )
  })

  // TC-8: Supabase insert error → 500
  it('TC-8: returns 500 when Supabase insert fails', async () => {
    allowAdmin()
    setupSupabaseMock({ error: { message: 'DB error' } })

    const req = mockRequest({ method: 'POST', body: { status: 'REVIEW' } })
    const res = await POST(req as any, { params: makeParams() })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBeTruthy()
  })

  // TC-9: Cache-Control: no-store header
  it('TC-9: response includes Cache-Control: no-store header', async () => {
    allowAdmin()
    setupSupabaseMock({ error: null })

    const req = mockRequest({ method: 'POST', body: { status: 'REVIEW' } })
    const res = await POST(req as any, { params: makeParams() })

    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
