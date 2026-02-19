// types/auth.types.ts
// Typy dla systemu autoryzacji i RBAC

/** Dozwolone role w systemie */
export type Role = 'ADMIN' | 'HELPER_PLUS' | 'HELPER';

/** Uprawnienia dostępne w aplikacji */
export interface Permission {
  canAccessDashboard: boolean;   // true tylko dla ADMIN
  canAccessHome: boolean;        // true dla ADMIN, HELPER_PLUS, HELPER
  canAccessAnalytics: boolean;   // true dla ADMIN i HELPER_PLUS
  canManageUsers: boolean;       // true tylko dla ADMIN
  canStartStory: boolean;        // true dla ADMIN i HELPER_PLUS
}

/** Uproszczony User (podzbiór Supabase User) */
export interface User {
  id: string;       // UUID — ten sam co auth.user.id
  email: string;    // adres email z Supabase Auth
}

/** Kształt kontekstu udostępnianego przez RoleProvider */
export interface RoleContextValue {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
}
