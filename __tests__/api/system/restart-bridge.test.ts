/**
 * __tests__/api/system/restart-bridge.test.ts
 * STORY-10.4 — Unit tests for POST /api/system/restart-bridge
 *
 * Test matrix:
 *  TC-1  401 — no session
 *  TC-2  403 — not ADMIN
 *  TC-3  200 — bridge accepts restart, returns success message
 *  TC-4  503 — bridge fetch throws (offline/timeout)
 *  TC-5  503 — bridge returns non-OK HTTP status
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

import { POST } from '@/app/api/system/restart-bridge/route'
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/system/restart-bridge', () => {
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
    const req = mockRequest({ method: 'POST' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-2
  it('TC-2: returns 403 when not ADMIN', async () => {
    denyForbidden()
    const req = mockRequest({ method: 'POST' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-3: bridge accepts restart
  it('TC-3: returns 200 with success message when bridge accepts restart', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })

    const req = mockRequest({ method: 'POST' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.message).toBe('Bridge restart zainicjowany — usługa wróci za chwilę')
  })

  // TC-4: bridge offline (fetch throws)
  it('TC-4: returns 503 when bridge fetch throws (offline/timeout)', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const req = mockRequest({ method: 'POST' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(503)
    const body = await res.json()

    expect(body.success).toBe(false)
  })

  // TC-5: bridge returns non-OK status
  it('TC-5: returns 503 when bridge returns non-OK HTTP status', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    const req = mockRequest({ method: 'POST' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(503)
    const body = await res.json()

    expect(body.success).toBe(false)
  })
})
