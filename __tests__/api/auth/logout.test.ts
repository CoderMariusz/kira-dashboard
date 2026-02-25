/**
 * __tests__/api/auth/logout.test.ts
 * STORY-14.4 — Integration tests for POST /api/auth/logout
 *
 * Test matrix:
 *  TC-1  303 — authenticated user, clears session, redirects to login
 *  TC-2  303 — unauthenticated user, still redirects (logout always works)
 */

import { jest } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => [],
    set: jest.fn(),
  }),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { POST } from '@/app/api/auth/logout/route';
import { mockAdminSession, mockNoSession } from '@/__tests__/helpers';
import { mockRequest } from '@/__tests__/helpers/fetch';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMockedCreateClient(): jest.Mock {
  const mod = jest.requireMock('@/lib/supabase/server') as {
    createClient: jest.Mock;
  };
  return mod.createClient;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    getMockedCreateClient().mockClear();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ── TC-1: 303 Redirect — clears session when authenticated ─────────────────

  it('TC-1: clears session and redirects to login when authenticated', async () => {
    const mockSignOut = jest.fn().mockResolvedValue({ error: null });
    getMockedCreateClient().mockResolvedValue({
      auth: {
        signOut: mockSignOut,
      },
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/logout',
    });

    const res = await POST();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/login');
  });

  // ── TC-2: 303 Redirect — still works when not authenticated ────────────────

  it('TC-2: still redirects to login when user is not authenticated', async () => {
    const mockSignOut = jest.fn().mockResolvedValue({ error: null });
    getMockedCreateClient().mockResolvedValue({
      auth: {
        signOut: mockSignOut,
      },
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/logout',
    });

    const res = await POST();

    // signOut should still be called even if there's no session
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/login');
  });

  // ── TC-3: Uses NEXT_PUBLIC_SITE_URL when available ────────────────────────

  it('TC-3: uses NEXT_PUBLIC_SITE_URL for redirect when available', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://kira.example.com';

    const mockSignOut = jest.fn().mockResolvedValue({ error: null });
    getMockedCreateClient().mockResolvedValue({
      auth: {
        signOut: mockSignOut,
      },
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/logout',
    });

    const res = await POST();

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://kira.example.com/login');
  });

  // ── TC-4: Falls back to localhost when NEXT_PUBLIC_SITE_URL not set ───────

  it('TC-4: falls back to localhost when NEXT_PUBLIC_SITE_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const mockSignOut = jest.fn().mockResolvedValue({ error: null });
    getMockedCreateClient().mockResolvedValue({
      auth: {
        signOut: mockSignOut,
      },
    });

    const req = mockRequest({
      method: 'POST',
      url: 'http://localhost/api/auth/logout',
    });

    const res = await POST();

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });
});
