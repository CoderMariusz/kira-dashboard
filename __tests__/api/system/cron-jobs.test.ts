/**
 * __tests__/api/system/cron-jobs.test.ts
 * STORY-10.4 — Unit tests for GET /api/system/cron-jobs
 *
 * Test matrix:
 *  TC-1  401 — no session
 *  TC-2  403 — not ADMIN
 *  TC-3  200 — happy path: proxy returns job list
 *  TC-4  200 — fallback when OpenClaw offline (fetch error)
 *  TC-5  200 — fallback when OpenClaw returns non-OK status
 *  TC-6  200 — wraps raw array in { jobs } if OpenClaw returns plain array
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

// ─── Imports ──────────────────────────────────────────────────────────────────

import { GET } from '@/app/api/system/cron-jobs/route'
import { mockRequest } from '@/__tests__/helpers/fetch'

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_JOBS = [
  { name: 'nightclaw', schedule: '0 2 * * *', lastRun: '2026-02-25T02:00:00Z', lastStatus: 'success' },
  { name: 'watchdog', schedule: '*/10 * * * *', lastRun: '2026-02-25T23:30:00Z', lastStatus: 'running' },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/system/cron-jobs', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  // TC-1
  it('TC-1: returns 401 when unauthenticated', async () => {
    denyUnauth()
    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-2
  it('TC-2: returns 403 when not ADMIN', async () => {
    denyForbidden()
    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-3: happy path proxy
  it('TC-3: proxies OpenClaw job list successfully', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: MOCK_JOBS }),
    })

    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.jobs).toHaveLength(2)
    expect(body.jobs[0].name).toBe('nightclaw')
    expect(body.jobs[0].schedule).toBe('0 2 * * *')
    expect(body.jobs[1].lastStatus).toBe('running')
    expect(body.error).toBeUndefined()
  })

  // TC-4: fallback when OpenClaw offline
  it('TC-4: returns { jobs: [], error } when OpenClaw fetch throws', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.jobs).toEqual([])
    expect(body.error).toBe('OpenClaw offline')
  })

  // TC-5: fallback when OpenClaw returns non-OK HTTP status
  it('TC-5: returns { jobs: [], error } when OpenClaw returns non-OK status', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({}),
    })

    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.jobs).toEqual([])
    expect(body.error).toBe('OpenClaw offline')
  })

  // TC-6: wraps plain array
  it('TC-6: wraps plain array response in { jobs }', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_JOBS, // plain array, not { jobs: [...] }
    })

    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(Array.isArray(body.jobs)).toBe(true)
  })
})
