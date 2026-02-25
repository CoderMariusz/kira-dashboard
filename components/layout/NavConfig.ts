// src/components/layout/NavConfig.ts

import type { Permission } from '@/types/auth.types';

// Typy dla konfiguracji nawigacji
export interface NavItemConfig {
  id: string;                   // unikalne ID (np. "overview", "tasks")
  label: string;                // wyświetlana nazwa (po polsku lub angielsku per projekt)
  icon: string;                 // emoji lub string z ikoną (np. "📊", "🛒")
  href: string;                 // pełna ścieżka routingu (np. "/dashboard", "/home/tasks")
  requirePermission?: keyof Permission; // jeśli ustawione — NavItem wymaga tego uprawnienia
}

export interface NavSectionConfig {
  id: string;                   // unikalne ID sekcji (np. "pipeline", "home", "settings")
  label: string;                // etykieta sekcji (np. "Pipeline", "Home", "Settings")
  requirePermission: keyof Permission;  // uprawnienie wymagane do widoczności CAŁEJ sekcji
  items: NavItemConfig[];       // lista elementów w sekcji
}

// ─── KONFIGURACJA NAWIGACJI ───────────────────────────────────────────────────
// Każda sekcja ma requirePermission — sekcja jest widoczna tylko gdy
// usePermissions()[requirePermission] === true.
//
// Wyjątek: sekcja "Home" jest widoczna dla ADMIN, HELPER_PLUS i HELPER
// (canAccessHome = true dla wszystkich ról), ale HELPER widzi tylko
// subset elementów (Tasks + Shopping) — te bez requirePermission.
// Elementy z requirePermission: "canAccessAnalytics" są ukryte dla HELPER.
// ─────────────────────────────────────────────────────────────────────────────

export const NAV_CONFIG: NavSectionConfig[] = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    requirePermission: 'canAccessDashboard',   // tylko ADMIN (canAccessDashboard = true)
    items: [
      { id: 'pipeline-overview', label: 'Overview', icon: '📊', href: '/dashboard' },
      { id: 'pipeline-models',   label: 'Models',   icon: '🤖', href: '/dashboard/models' },
      { id: 'pipeline-pipeline', label: 'Pipeline', icon: '▶️', href: '/dashboard/pipeline' },
      { id: 'pipeline-eval',     label: 'Eval',     icon: '🧪', href: '/dashboard/eval' },
      { id: 'pipeline-patterns', label: 'Patterns & Lessons', icon: '🧠', href: '/dashboard/patterns' },
      { id: 'pipeline-health',     label: 'Health',    icon: '❤️', href: '/dashboard/health' },
      { id: 'pipeline-nightclaw', label: 'NightClaw', icon: '🌙', href: '/dashboard/nightclaw' },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    requirePermission: 'canAccessHome',  // ADMIN + HELPER_PLUS + HELPER (wszyscy)
    items: [
      // Z requirePermission: "canAccessAnalytics" = widoczne tylko dla ADMIN + HELPER_PLUS
      { id: 'home-overview',  label: 'Home Overview', icon: '🏠', href: '/home',           requirePermission: 'canAccessAnalytics' },
      // Bez requirePermission = widoczne dla wszystkich ról w tej sekcji
      { id: 'home-shopping',  label: 'Shopping',      icon: '🛒', href: '/home/shopping'   /* brak requirePermission */ },
      { id: 'home-tasks',     label: 'Tasks',         icon: '✅', href: '/home/tasks'      /* brak requirePermission */ },
      // Z requirePermission: "canAccessAnalytics" = widoczne tylko dla ADMIN + HELPER_PLUS
      { id: 'home-activity',  label: 'Activity',      icon: '📅', href: '/home/activity',  requirePermission: 'canAccessAnalytics' },
      { id: 'home-analytics', label: 'Analytics',     icon: '📈', href: '/home/analytics', requirePermission: 'canAccessAnalytics' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    requirePermission: 'canManageUsers',  // tylko ADMIN (canManageUsers = true)
    items: [
      { id: 'settings-users',  label: 'Users',  icon: '👥', href: '/settings/users' },
      { id: 'settings-system', label: 'System', icon: '⚙️', href: '/settings/system' },
    ],
  },
];
