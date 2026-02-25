/**
 * __tests__/middleware/settings-guard.test.ts
 * STORY-10.2 — Route guard tests for /settings/* paths.
 *
 * Tests:
 * - HELPER role accessing /settings/users → redirect to /403
 * - ADMIN role accessing /settings/users → no redirect
 * - HELPER_PLUS role accessing /settings/system → redirect to /403
 */

import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

// ─── Mock @supabase/ssr ───────────────────────────────────────────────────────

const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSingle = jest.fn();

const mockSupabaseAuthGetUser = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: mockSupabaseAuthGetUser,
    },
    from: mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect.mockReturnValue({
        eq: mockSupabaseEq.mockReturnValue({
          single: mockSupabaseSingle,
        }),
      }),
    }),
  })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockRequest(pathname: string): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  return {
    nextUrl: new URL(url),
    url,
    cookies: {
      getAll: jest.fn(() => []),
      set: jest.fn(),
    },
  } as unknown as NextRequest;
}

function mockUserRole(role: string | null): void {
  mockSupabaseSingle.mockResolvedValue({
    data: role ? { role } : null,
    error: role ? null : new Error('No role found'),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('middleware /settings/* route guard (STORY-10.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticated user
    mockSupabaseAuthGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
  });

  it('redirects HELPER role accessing /settings/users to /403', async () => {
    mockUserRole('HELPER');

    const request = createMockRequest('/settings/users');
    const response = await middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307); // Redirect status

    // Check that it's a redirect to /403
    const locationHeader = response.headers.get('location');
    expect(locationHeader).toContain('/403');
  });

  it('allows ADMIN role to access /settings/users without redirect', async () => {
    mockUserRole('ADMIN');

    const request = createMockRequest('/settings/users');
    const response = await middleware(request);

    expect(response).toBeInstanceOf(NextResponse);

    // Should NOT redirect to /403
    const locationHeader = response.headers.get('location');
    expect(locationHeader).not.toContain('/403');
  });

  it('redirects HELPER_PLUS role accessing /settings/system to /403', async () => {
    mockUserRole('HELPER_PLUS');

    const request = createMockRequest('/settings/system');
    const response = await middleware(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307); // Redirect status

    const locationHeader = response.headers.get('location');
    expect(locationHeader).toContain('/403');
  });

  it('redirects non-ADMIN roles accessing /settings to /403', async () => {
    mockUserRole('VIEWER');

    const request = createMockRequest('/settings');
    const response = await middleware(request);

    const locationHeader = response.headers.get('location');
    expect(locationHeader).toContain('/403');
  });

  it('allows ADMIN to access /settings/roles', async () => {
    mockUserRole('ADMIN');

    const request = createMockRequest('/settings/roles');
    const response = await middleware(request);

    const locationHeader = response.headers.get('location');
    expect(locationHeader).toBeNull();
  });
});
