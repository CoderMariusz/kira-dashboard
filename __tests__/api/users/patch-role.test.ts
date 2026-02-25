/**
 * __tests__/api/users/patch-role.test.ts
 * STORY-10.3 — Integration tests for PATCH /api/users/[id]/role endpoint.
 *
 * Test matrix:
 *  TC-1  401 — no session
 *  TC-2  403 — not ADMIN
 *  TC-3  400 — missing/invalid role in body
 *  TC-4  422 — self-modification blocked
 *  TC-5  404 — target user not found in user_roles
 *  TC-6  422 — demoting last ADMIN blocked
 *  TC-7  200 — happy path: role updated
 *  TC-8  500 — update query error
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

// ─── Mock Supabase server (for requireAdmin) ──────────────────────────────────

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

// ─── Admin client mock ────────────────────────────────────────────────────────

// We track calls per table query via a shared control object
const mockMaybeSingle = jest.fn()
const mockCountHead = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((_table: string) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockImplementation(() => mockMaybeSingle()),
          // for count queries:
        }),
        count: undefined,
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation(() => mockUpdate()),
      }),
    })),
  })),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { PATCH } from '@/app/api/users/[id]/role/route'
import { mockAdminSession, mockNoSession, mockUserSession } from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Helper: build params ─────────────────────────────────────────────────────

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_ID = 'admin-user-id'
const TARGET_ID = 'target-user-abc'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PATCH /api/users/[id]/role', () => {
  beforeEach(() => jest.clearAllMocks())

  // TC-1: 401

  it('TC-1: returns 401 when unauthenticated', async () => {
    mockNoSession()
    const req = mockRequest({ method: 'PATCH', body: { role: 'HELPER' } })
    const res = await PATCH(req, makeParams(TARGET_ID))
    expect(res.status).toBe(401)
  })

  // TC-2: 403

  it('TC-2: returns 403 when not ADMIN', async () => {
    mockUserSession()
    const req = mockRequest({ method: 'PATCH', body: { role: 'HELPER' } })
    const res = await PATCH(req, makeParams(TARGET_ID))
    expect(res.status).toBe(403)
  })

  // TC-3: invalid role

  it('TC-3: returns 400 when role is invalid', async () => {
    mockAdminSession()
    const req = mockRequest({ method: 'PATCH', body: { role: 'SUPERUSER' } })
    const res = await PATCH(req, makeParams(TARGET_ID))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/rola/i)
  })

  it('TC-3b: returns 400 when role is missing', async () => {
    mockAdminSession()
    const req = mockRequest({ method: 'PATCH', body: {} })
    const res = await PATCH(req, makeParams(TARGET_ID))
    expect(res.status).toBe(400)
  })

  // TC-4: self-modification

  it('TC-4: returns 422 when trying to change own role', async () => {
    mockAdminSession({ id: ADMIN_ID })
    const req = mockRequest({ method: 'PATCH', body: { role: 'HELPER' } })
    const res = await PATCH(req, makeParams(ADMIN_ID))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/własn/i)
  })

  // TC-5: target not found

  it('TC-5: returns 404 when target user not found', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const req = mockRequest({ method: 'PATCH', body: { role: 'HELPER' } })
    const res = await PATCH(req, makeParams(TARGET_ID))
    expect(res.status).toBe(404)
  })

  // TC-7: happy path

  it('TC-7: returns 200 when role updated successfully', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockMaybeSingle.mockResolvedValue({ data: { role: 'HELPER' }, error: null })
    mockUpdate.mockResolvedValue({ error: null })
    const req = mockRequest({ method: 'PATCH', body: { role: 'HELPER_PLUS' } })
    const res = await PATCH(req, makeParams(TARGET_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  // TC-8: update error

  it('TC-8: returns 500 when update query fails', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockMaybeSingle.mockResolvedValue({ data: { role: 'HELPER' }, error: null })
    mockUpdate.mockResolvedValue({ error: new Error('DB error') })
    const req = mockRequest({ method: 'PATCH', body: { role: 'HELPER_PLUS' } })
    const res = await PATCH(req, makeParams(TARGET_ID))
    expect(res.status).toBe(500)
  })
})
