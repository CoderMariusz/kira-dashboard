/**
 * __tests__/api/users/invite.test.ts
 * STORY-10.3 — Integration tests for POST /api/users/invite endpoint.
 *
 * Test matrix:
 *  TC-1  401 — no session
 *  TC-2  403 — not ADMIN
 *  TC-3  400 — invalid JSON body
 *  TC-4  400 — missing email
 *  TC-5  400 — invalid email format
 *  TC-6  400 — missing role
 *  TC-7  400 — invalid role value
 *  TC-8  409 — user already exists
 *  TC-9  201 — happy path: invite sent + user_roles inserted with invited_by
 *  TC-10 500 — invite API error
 *  TC-11 500 — user_roles insert fails (rollback via deleteUser)
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

const mockInviteUserByEmail = jest.fn()
const mockDeleteUser = jest.fn()
const mockInsert = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((_table: string) => ({
      insert: jest.fn((...args: any[]) => mockInsert(...args)),
    })),
    auth: {
      admin: {
        inviteUserByEmail: jest.fn((...args: any[]) => mockInviteUserByEmail(...args)),
        deleteUser: jest.fn((...args: any[]) => mockDeleteUser(...args)),
      },
    },
  })),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST } from '@/app/api/users/invite/route'
import { mockAdminSession, mockNoSession, mockUserSession } from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_ID = 'admin-user-id'
const NEW_USER_ID = 'new-invited-user-id'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/users/invite', () => {
  beforeEach(() => jest.clearAllMocks())

  // TC-1: 401

  it('TC-1: returns 401 when unauthenticated', async () => {
    mockNoSession()
    const req = mockRequest({ method: 'POST', body: { email: 'test@example.com', role: 'HELPER' } })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  // TC-2: 403

  it('TC-2: returns 403 when not ADMIN', async () => {
    mockUserSession()
    const req = mockRequest({ method: 'POST', body: { email: 'test@example.com', role: 'HELPER' } })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  // TC-3: invalid JSON

  it('TC-3: returns 400 when body is invalid JSON', async () => {
    mockAdminSession({ id: ADMIN_ID })
    const req = new globalThis.Request('http://localhost/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }) as any
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // TC-4: missing email

  it('TC-4: returns 400 when email is missing', async () => {
    mockAdminSession({ id: ADMIN_ID })
    const req = mockRequest({ method: 'POST', body: { role: 'HELPER' } })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-5: invalid email format

  it('TC-5: returns 400 when email format is invalid', async () => {
    mockAdminSession({ id: ADMIN_ID })
    const req = mockRequest({ method: 'POST', body: { email: 'not-an-email', role: 'HELPER' } })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email/i)
  })

  // TC-6: missing role

  it('TC-6: returns 400 when role is missing', async () => {
    mockAdminSession({ id: ADMIN_ID })
    const req = mockRequest({ method: 'POST', body: { email: 'test@example.com' } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // TC-7: invalid role

  it('TC-7: returns 400 when role is invalid', async () => {
    mockAdminSession({ id: ADMIN_ID })
    const req = mockRequest({ method: 'POST', body: { email: 'test@example.com', role: 'SUPERADMIN' } })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/rola/i)
  })

  // TC-8: user already exists (409)

  it('TC-8: returns 409 when user already exists', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockInviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: 'User already registered', status: 422 },
    })
    const req = mockRequest({ method: 'POST', body: { email: 'existing@example.com', role: 'HELPER' } })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/już istnieje/i)
  })

  // TC-9: happy path

  it('TC-9: returns 201 on successful invite with invited_by set', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: NEW_USER_ID } },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })

    const req = mockRequest({ method: 'POST', body: { email: 'newuser@example.com', role: 'HELPER' } })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.message).toMatch(/zaproszenie/i)

    // Verify insert was called with invited_by = ADMIN_ID
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: NEW_USER_ID,
        role: 'HELPER',
        invited_by: ADMIN_ID,
        invited_at: expect.any(String),
      })
    )
  })

  // TC-10: invite API error

  it('TC-10: returns 500 when Supabase invite API fails', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockInviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: 'Internal server error', status: 500 },
    })
    const req = mockRequest({ method: 'POST', body: { email: 'test@example.com', role: 'HELPER' } })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  // TC-11: insert fails → rollback

  it('TC-11: returns 500 and deletes user when user_roles insert fails', async () => {
    mockAdminSession({ id: ADMIN_ID })
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: NEW_USER_ID } },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: new Error('Insert failed') })
    mockDeleteUser.mockResolvedValue({ error: null })

    const req = mockRequest({ method: 'POST', body: { email: 'test@example.com', role: 'HELPER' } })
    const res = await POST(req)
    expect(res.status).toBe(500)

    // Verify rollback: auth user was deleted
    expect(mockDeleteUser).toHaveBeenCalledWith(NEW_USER_ID)
  })
})
