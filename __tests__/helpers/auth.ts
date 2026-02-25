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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FakeSupabaseClient = any;

// ─── Internal: build a fake Supabase client ───────────────────────────────────

function buildClient(
  user: MockSupabaseUser | null,
  authError: Error | null,
  role: MockUserRole | null,
  roleError: Error | null
): FakeSupabaseClient {
  const singleMock = jest.fn(() => Promise.resolve({ data: role, error: roleError }));

  const selectChain = {
    eq: jest.fn().mockReturnThis(),
    single: singleMock,
  };

  const fromChain = {
    select: jest.fn().mockReturnValue(selectChain),
  };

  const getUserMock = jest.fn(() => Promise.resolve({ data: { user }, error: authError }));

  return {
    auth: {
      getUser: getUserMock,
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
  getMockedCreateClient().mockImplementation(() => Promise.resolve(buildClient(user, null, { role: 'ADMIN' }, null)));
}

export function mockUserSession(overrides: Partial<MockSupabaseUser> = {}): void {
  const user: MockSupabaseUser = { id: 'plain-user-id', email: 'user@kira.local', ...overrides };
  getMockedCreateClient().mockImplementation(() => Promise.resolve(buildClient(user, null, { role: 'USER' }, null)));
}

export function mockNoSession(): void {
  getMockedCreateClient().mockImplementation(() =>
    Promise.resolve(buildClient(null, new Error('Not authenticated'), null, null))
  );
}
