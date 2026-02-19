// lib/auth/permissions.ts
// Mapa uprawnień dla ról

import type { Role, Permission } from '@/types/auth.types';

/** Pełna tabela uprawnień per rola */
export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  ADMIN: {
    canAccessDashboard: true,
    canAccessHome: true,
    canAccessAnalytics: true,
    canManageUsers: true,
    canStartStory: true,
  },
  HELPER_PLUS: {
    canAccessDashboard: false,
    canAccessHome: true,
    canAccessAnalytics: true,
    canManageUsers: false,
    canStartStory: true,
  },
  HELPER: {
    canAccessDashboard: false,
    canAccessHome: true,
    canAccessAnalytics: false,
    canManageUsers: false,
    canStartStory: false,
  },
};

/** Uprawnienia dla niezalogowanego usera (role === null) */
export const NO_PERMISSIONS: Permission = {
  canAccessDashboard: false,
  canAccessHome: false,
  canAccessAnalytics: false,
  canManageUsers: false,
  canStartStory: false,
};
