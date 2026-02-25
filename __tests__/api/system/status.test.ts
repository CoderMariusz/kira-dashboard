/**
 * __tests__/api/system/status.test.ts
 * STORY-10.4 — Unit tests for GET /api/system/status
 *
 * Test matrix:
 *  TC-1  401 — no session
 *  TC-2  403 — not ADMIN
 *  TC-3  200 — both services UP
 *  TC-4  200 — bridge DOWN (fetch fails)
 *  TC-5  200 — openclaw DOWN (defaults), bridge UP
 *  TC-6  200 — both services DOWN/fail
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

// ─── Mock Supabase server (for requireAdmin via requireRole) ──────────────────

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

// ─── Mock requireRole ─────────────────────────────────────────────────────────

const mockRequireAdmin = jest.fn()
jest.mock('@/lib/auth/requireRole', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { GET } from '@/app/api/system/status/route'
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

describe('GET /api/system/status', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  // TC-1: 401 without session
  it('TC-1: returns 401 when unauthenticated', async () => {
    denyUnauth()
    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-2: 403 non-admin
  it('TC-2: returns 403 when not ADMIN', async () => {
    denyForbidden()
    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-3: both services UP
  it('TC-3: returns 200 with both services UP', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ version: '2.0', uptime: 3600, channels: { whatsapp: true, telegram: true } }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ status: 'UP', version: '1.4.2', lastError: null }),
      })

    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.openclaw.version).toBe('2.0')
    expect(body.openclaw.uptime).toBe(3600)
    expect(body.openclaw.channels.whatsapp).toBe(true)
    expect(body.openclaw.channels.telegram).toBe(true)
    expect(body.bridge.status).toBe('UP')
    expect(body.bridge.version).toBe('1.4.2')
    expect(body.bridge.lastError).toBeNull()
  })

  // TC-4: bridge DOWN when fetch fails
  it('TC-4: returns bridge DOWN when bridge fetch fails', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ version: '2.0', uptime: 100, channels: {} }),
      })
      .mockRejectedValueOnce(new Error('connection refused'))

    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.bridge.status).toBe('DOWN')
    expect(body.bridge.version).toBeNull()
    expect(body.bridge.lastError).toBeNull()
  })

  // TC-5: openclaw defaults when openclaw fetch fails
  it('TC-5: returns openclaw defaults when openclaw offline', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce({
        json: async () => ({ status: 'UP', version: '1.0', lastError: null }),
      })

    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.openclaw.version).toBe('unknown')
    expect(body.openclaw.uptime).toBe(0)
    expect(body.bridge.status).toBe('UP')
  })

  // TC-6: both DOWN
  it('TC-6: returns DOWN for both when both fail (timeout scenario)', async () => {
    allowAdmin()
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('AbortError'))
      .mockRejectedValueOnce(new Error('AbortError'))

    const req = mockRequest()
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.openclaw.version).toBe('unknown')
    expect(body.openclaw.uptime).toBe(0)
    expect(body.bridge.status).toBe('DOWN')
    expect(body.bridge.version).toBeNull()
  })
})
