/**
 * __tests__/hooks/useUserRole.test.tsx
 * STORY-7.2 — Tests for the useUserRole() hook.
 *
 * AC-6: hook exposes { role, isAdmin, isLoading } from RoleContext.
 * Scenarios: loading state, isAdmin=true, isAdmin=false.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useUserRole } from '@/hooks/useUserRole';

// ─── Mock RoleContext ─────────────────────────────────────────────────────────

// We mock the entire module so we can control useUser() output per-test.
jest.mock('@/contexts/RoleContext', () => ({
  useUser: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useUser } = jest.requireMock('@/contexts/RoleContext') as {
  useUser: jest.Mock;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUserRole()', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns isLoading=true while session is being fetched', () => {
    useUser.mockReturnValue({ user: null, role: null, isLoading: true });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('returns isAdmin=true and role="ADMIN" for an ADMIN user', () => {
    useUser.mockReturnValue({
      user: { id: 'admin-id', email: 'admin@kira.local' },
      role: 'ADMIN',
      isLoading: false,
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.role).toBe('ADMIN');
    expect(result.current.isAdmin).toBe(true);
  });

  it('returns isAdmin=false and role="HELPER" for a non-ADMIN user', () => {
    useUser.mockReturnValue({
      user: { id: 'helper-id', email: 'helper@kira.local' },
      role: 'HELPER',
      isLoading: false,
    });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.role).toBe('HELPER');
    expect(result.current.isAdmin).toBe(false);
  });

  it('returns isAdmin=false when role is null (unauthenticated)', () => {
    useUser.mockReturnValue({ user: null, role: null, isLoading: false });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });
});
