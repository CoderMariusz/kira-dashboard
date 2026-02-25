/**
 * __tests__/api/users/get-users.test.ts
 * STORY-10.3 — Integration tests for GET /api/users endpoint.
 *
 * Test matrix:
 *  TC-1  401 — no session
 *  TC-2  403 — authenticated but not ADMIN
 *  TC-3  200 — ADMIN session, returns users with role, invited_at, invited_by_email
 *  TC-4  200 — empty user_roles table → { users: [] }
 *  TC-5  500 — user_roles query fails
 *  TC-6  500 — auth.admin.listUsers fails
 *  TC-7  200 — invited_by_email resolved from emailMap
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

// ─── Mock Supabase admin client ───────────────────────────────────────────────

const mockListUsers = jest.fn()
const mockFromSelect = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      void table
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockImplementation(() => mockFromSelect()),
        }),
      }
    }),
    auth: {
      admin: {
        listUsers: jest.fn((...args: any[]) => mockListUsers(...args)),
      },
    },
  })),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { GET } from '@/app/api/users/route'
import { mockAdminSession, mockNoSession, mockUserSession } from '@/__tests__/helpers/auth'
import { mockRequest } from '@/__tests__/helpers/fetch'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_ID = 'admin-user-id'
const USER_ID = 'user-abc-123'
const INVITER_ID = 'inviter-user-id'

const mockRoleData = [
  {
    user_id: ADMIN_ID,
    role: 'ADMIN',
    created_at: '2026-01-01T00:00:00Z',
    invited_by: null,
    invited_at: null,
  },
  {
    user_id: USER_ID,
    role: 'HELPER',
    created_at: '2026-02-01T00:00:00Z',
    invited_by: INVITER_ID,
    invited_at: '2026-02-01T10:00:00Z',
  },
]

const mockAuthUsers = {
  users: [
    { id: ADMIN_ID, email: 'admin@kira.local' },
    { id: USER_ID, email: 'helper@kira.local' },
    { id: INVITER_ID, email: 'inviter@kira.local' },
  ],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  beforeEach(() => jest.clearAllMocks())

  // TC-1: 401 without session

  it('TC-1: returns 401 when unauthenticated', async () => {
    mockNoSession()
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-2: 403 non-admin

  it('TC-2: returns 403 when authenticated but not ADMIN', async () => {
    mockUserSession() // returns role: 'USER'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-3: 200 happy path

  it('TC-3: returns 200 with users list for ADMIN', async () => {
    mockAdminSession()
    mockFromSelect.mockResolvedValue({ data: mockRoleData, error: null })
    mockListUsers.mockResolvedValue({ data: mockAuthUsers, error: null })

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('users')
    expect(body.users).toHaveLength(2)

    const adminUser = body.users.find((u: any) => u.id === ADMIN_ID)
    expect(adminUser).toMatchObject({
      id: ADMIN_ID,
      email: 'admin@kira.local',
      role: 'ADMIN',
      invited_at: null,
      invited_by_email: null,
    })

    const helperUser = body.users.find((u: any) => u.id === USER_ID)
    expect(helperUser).toMatchObject({
      id: USER_ID,
      email: 'helper@kira.local',
      role: 'HELPER',
      invited_at: '2026-02-01T10:00:00Z',
      invited_by_email: 'inviter@kira.local',
    })
  })

  // TC-4: empty user_roles

  it('TC-4: returns { users: [] } when no roles in DB', async () => {
    mockAdminSession()
    mockFromSelect.mockResolvedValue({ data: [], error: null })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toEqual([])
  })

  // TC-5: user_roles query error

  it('TC-5: returns 500 when user_roles query fails', async () => {
    mockAdminSession()
    mockFromSelect.mockResolvedValue({ data: null, error: new Error('DB error') })

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-6: auth.admin.listUsers error

  it('TC-6: returns 500 when auth.admin.listUsers fails', async () => {
    mockAdminSession()
    mockFromSelect.mockResolvedValue({ data: mockRoleData, error: null })
    mockListUsers.mockResolvedValue({ data: null, error: new Error('Auth API error') })

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  // TC-7: invited_by_email resolved

  it('TC-7: resolves invited_by_email from email map', async () => {
    mockAdminSession()
    mockFromSelect.mockResolvedValue({
      data: [
        {
          user_id: USER_ID,
          role: 'HELPER_PLUS',
          created_at: '2026-02-01T00:00:00Z',
          invited_by: INVITER_ID,
          invited_at: '2026-02-01T10:00:00Z',
        },
      ],
      error: null,
    })
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: USER_ID, email: 'helper@kira.local' },
          { id: INVITER_ID, email: 'inviter@kira.local' },
        ],
      },
      error: null,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users[0].invited_by_email).toBe('inviter@kira.local')
  })
})
