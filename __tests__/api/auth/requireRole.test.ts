/**
 * __tests__/api/auth/requireRole.test.ts
 * STORY-7.2 — Integration tests for requireAdmin() and requireAuth().
 *
 * AC-5: mockNoSession → 401, mockUserSession → 403 (requireAdmin),
 *       mockAdminSession → pass (returns user object).
 */

import { NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/auth/requireRole';
import {
  mockAdminSession,
  mockUserSession,
  mockNoSession,
} from '@/__tests__/helpers/auth';
import { mockRequest } from '@/__tests__/helpers/fetch';

// ─── Mock Supabase server client ──────────────────────────────────────────────
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseStatus(response: NextResponse): Promise<number> {
  return response.status;
}

async function parseBody(response: NextResponse): Promise<Record<string, unknown>> {
  const text = await response.text();
  return JSON.parse(text) as Record<string, unknown>;
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe('requireAdmin()', () => {
  it('returns 401 when there is no session (mockNoSession)', async () => {
    mockNoSession();

    const result = await requireAdmin(mockRequest());

    // Must be a NextResponse (not a user object)
    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(await parseStatus(res)).toBe(401);

    const body = await parseBody(res);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });

  it('returns 403 when user has a non-ADMIN role (mockUserSession)', async () => {
    mockUserSession();

    const result = await requireAdmin(mockRequest());

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(await parseStatus(res)).toBe(403);

    const body = await parseBody(res);
    expect(body.error).toBe('Brak uprawnień do zarządzania golden tasks');
  });

  it('returns { user, role: "ADMIN" } when user is ADMIN (mockAdminSession)', async () => {
    mockAdminSession();

    const result = await requireAdmin(mockRequest());

    // Must NOT be a NextResponse
    expect(result).not.toBeInstanceOf(NextResponse);
    const success = result as { user: { id: string }; role: string };
    expect(success.role).toBe('ADMIN');
    expect(success.user).toBeDefined();
    expect(typeof success.user.id).toBe('string');
  });

  it('works without a req argument (optional param)', async () => {
    mockAdminSession();

    const result = await requireAdmin();

    expect(result).not.toBeInstanceOf(NextResponse);
    const success = result as { user: { id: string }; role: string };
    expect(success.role).toBe('ADMIN');
  });
});

// ─── requireAuth ──────────────────────────────────────────────────────────────

describe('requireAuth()', () => {
  it('returns 401 when there is no session (mockNoSession)', async () => {
    mockNoSession();

    const result = await requireAuth(mockRequest());

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(await parseStatus(res)).toBe(401);

    const body = await parseBody(res);
    expect(body).toHaveProperty('error');
  });

  it('passes for a non-ADMIN user and returns { user, role } (mockUserSession)', async () => {
    mockUserSession();

    const result = await requireAuth(mockRequest());

    expect(result).not.toBeInstanceOf(NextResponse);
    const success = result as { user: { id: string }; role: string };
    expect(success.user).toBeDefined();
    expect(typeof success.role).toBe('string');
    // role should reflect what was set in the mock (USER)
    expect(success.role).toBe('USER');
  });

  it('passes for an ADMIN user and returns { user, role: "ADMIN" } (mockAdminSession)', async () => {
    mockAdminSession();

    const result = await requireAuth(mockRequest());

    expect(result).not.toBeInstanceOf(NextResponse);
    const success = result as { user: { id: string }; role: string };
    expect(success.role).toBe('ADMIN');
    expect(success.user.id).toBe('admin-user-id');
  });
});
