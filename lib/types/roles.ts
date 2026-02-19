// lib/types/roles.ts — Role types and constants for RBAC
// Must match CHECK constraint in DB: user_roles table

export type UserRole = 'ADMIN' | 'HELPER_PLUS' | 'HELPER';

export const VALID_ROLES: readonly UserRole[] = ['ADMIN', 'HELPER_PLUS', 'HELPER'] as const;

export function isValidRole(value: string): value is UserRole {
  return (VALID_ROLES as readonly string[]).includes(value);
}

// Role-to-default-redirect mapping (used in login page and middleware)
export const ROLE_DEFAULT_REDIRECT: Record<UserRole, string> = {
  ADMIN: '/dashboard',
  HELPER_PLUS: '/home',
  HELPER: '/home/tasks',
};
