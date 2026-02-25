/**
 * __tests__/helpers/auth.ts
 * STORY-7.2 — Supabase auth mock helpers for Next.js App Router tests.
 *
 * Usage: call mockAdminSession() / mockUserSession() / mockNoSession()
 * inside a describe block or beforeEach to control what
 * @/lib/supabase/server's createClient returns.
 *
 * Prerequisite: the consuming test file must have:
 *   jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
 */

import { jest } from '@jest/globals';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MockSupabaseUser {
  id: string;
  email?: string;
}

export interface MockUserRole {
  role: 'ADMIN' | 'USER' | 'VIEWER';
}

// ─── Internal: build a fake Supabase client ───────────────────────────────────

function buildClient(
  user: MockSupabaseUser | null,
  authError: Error | null,
  role: MockUserRole | null,
  roleError: Error | null
) {
  const selectChain = {
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: role, error: roleError } as any),
  };

  const fromChain = {
    select: jest.fn().mockReturnValue(selectChain),
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: authError } as any),
    },
    from: jest.fn().mockReturnValue(fromChain),
  };
}

// ─── Internal: get the mocked createClient function ──────────────────────────

function getMockedCreateClient(): jest.Mock {
  const mod = jest.requireMock('@/lib/supabase/server') as {
    createClient: jest.Mock;
  };
  return mod.createClient;
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

export function mockAdminSession(overrides: Partial<MockSupabaseUser> = {}): void {
  const user: MockSupabaseUser = { id: 'admin-user-id', email: 'admin@kira.local', ...overrides };
  getMockedCreateClient().mockResolvedValue(buildClient(user, null, { role: 'ADMIN' }, null) as any);
}

export function mockUserSession(overrides: Partial<MockSupabaseUser> = {}): void {
  const user: MockSupabaseUser = { id: 'plain-user-id', email: 'user@kira.local', ...overrides };
  getMockedCreateClient().mockResolvedValue(buildClient(user, null, { role: 'USER' }, null) as any);
}

export function mockNoSession(): void {
  getMockedCreateClient().mockResolvedValue(
    buildClient(null, new Error('Not authenticated'), null, null) as any
  );
}
