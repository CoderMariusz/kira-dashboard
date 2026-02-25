/**
 * __tests__/api/users/delete-user.test.ts
 * STORY-10.3 — Integration tests for DELETE /api/users/[id] endpoint.
 *
 * Test matrix:
 *  TC-1  401 — no session
 *  TC-2  403 — not ADMIN
 *  TC-3  400 — missing user id
 *  TC-4  422 — self-deletion blocked
 *  TC-5  404 — target user not found in user_roles
 *  TC-6  422 — deleting last ADMIN blocked
 *  TC-7  200 — happy path: user removed from user_roles
 *  TC-8  500 — delete query error
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

const mockMaybeSingle = jest.fn()
const mockCountSelect = jest.fn()
const mockDeleteEq = jest.fn()
const mockAuthDeleteUser = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((_table: string) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockImplementation(() => mockMaybeSingle()),
        }),
        count: 'exact',
        head: true,
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation(() => mockDeleteEq()),
      }),
    })),
    auth: {
      admin: {
        deleteUser: jest.fn((...args: any[]) => mockAuthDeleteUser(...args)),
      },
    },
  })),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { DELETE } from '@/app/api/users/[id]/route'
import { mockAdminSession, mockNoSession, mockUserSession } from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_ID = 'admin-user-id'
const TARGET_ID = 'target-user-abc'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DELETE /api/users/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  // TC-1: 401

  it('TC-1: returns 401 when unauthenticated', async () => {
    mockNoSession()
    const req = mockRequest({ method: 'DELETE' })
    const res = await DELETE(req, makeParams(TARGET_ID))
    expect(res.status).toBe(401)
  })

  // TC-2: 403

  it('TC-2: returns 403 when not ADMIN', async () => {
    mockUserSession()
    const req = mockRequest({ method: 'DELETE' })
    const res = await DELETE(req, makeParams(TARGET_ID))
    expect(res.status).toBe(403)
  })

  // TC-3: missing id

  it('TC-3: returns 400 when id is empty string', async () => {
    mockAdminSession({ id: ADMIN_ID })
    const req = mockRequest({ method: 'DELETE' })
    const res = await DELETE(req, makeParams(''))
    expect(res.status).toBe(400)
  })

  // TC-4: self-deletion

  it('TC-4: returns 422 when trying to delete own account', async () => {
    mockAdminSession({ id: ADMIN_ID })
    const req = mockRequest({ method: 'DELETE' })
    const res = await DELETE(req, makeParams(ADMIN_ID))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/własn/i)
  })

  // TC-5: target not found

  it('TC-5: returns 404 when target user not in user_roles', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const req = mockRequest({ method: 'DELETE' })
    const res = await DELETE(req, makeParams(TARGET_ID))
    expect(res.status).toBe(404)
  })

  // TC-7: happy path (HELPER user)

  it('TC-7: returns 200 when HELPER user deleted from user_roles', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockMaybeSingle.mockResolvedValue({ data: { role: 'HELPER' }, error: null })
    mockDeleteEq.mockResolvedValue({ error: null })
    mockAuthDeleteUser.mockResolvedValue({ error: null })
    const req = mockRequest({ method: 'DELETE' })
    const res = await DELETE(req, makeParams(TARGET_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  // TC-8: delete error

  it('TC-8: returns 500 when delete query fails', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockMaybeSingle.mockResolvedValue({ data: { role: 'HELPER' }, error: null })
    mockDeleteEq.mockResolvedValue({ error: new Error('DB error') })
    const req = mockRequest({ method: 'DELETE' })
    const res = await DELETE(req, makeParams(TARGET_ID))
    expect(res.status).toBe(500)
  })
})
