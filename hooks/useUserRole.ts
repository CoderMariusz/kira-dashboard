'use client';
/**
 * hooks/useUserRole.ts
 * STORY-7.2 — Client-side hook exposing the current user's role.
 *
 * Delegates to the existing RoleContext (which handles Supabase session
 * hydration + user_roles lookup) and re-shapes the data for UI consumers.
 *
 * Usage:
 *   const { role, isAdmin, isLoading } = useUserRole();
 *   if (isAdmin) showCrudButtons();
 */

import { useUser } from '@/contexts/RoleContext';

export interface UserRoleResult {
  /** Current role string ('ADMIN' | 'HELPER_PLUS' | 'HELPER') or null when loading / unauthenticated */
  role: string | null;
  /** True only when role === 'ADMIN' */
  isAdmin: boolean;
  /** True while the session / role is being fetched */
  isLoading: boolean;
}

export function useUserRole(): UserRoleResult {
  const { role, isLoading } = useUser();

  return {
    role,
    isAdmin: role === 'ADMIN',
    isLoading,
  };
}
