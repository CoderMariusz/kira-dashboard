/**
 * Application Constants
 * Kira Dashboard - Global configuration
 */

// ══════════════════════════════════════════════════════════
// BOARD COLUMNS
// ══════════════════════════════════════════════════════════

/**
 * Home board columns (3 stages)
 */
export const HOME_COLUMNS = ['idea', 'in_progress', 'done'] as const;

/**
 * Work board columns (4 stages with planning)
 */
export const WORK_COLUMNS = ['idea', 'plan', 'in_progress', 'done'] as const;

export type HomeColumn = typeof HOME_COLUMNS[number];
export type WorkColumn = typeof WORK_COLUMNS[number];
export type TaskColumn = HomeColumn | WorkColumn;

/**
 * Column display metadata
 */
export const COLUMN_META = {
  idea: {
    label: 'Pomysły',
    icon: '💡',
    color: 'bg-yellow-100 dark:bg-yellow-900/20',
  },
  plan: {
    label: 'Plan',
    icon: '📝',
    color: 'bg-blue-100 dark:bg-blue-900/20',
  },
  in_progress: {
    label: 'W realizacji',
    icon: '🚀',
    color: 'bg-purple-100 dark:bg-purple-900/20',
  },
  done: {
    label: 'Zrobione',
    icon: '✅',
    color: 'bg-green-100 dark:bg-green-900/20',
  },
} as const;

// ══════════════════════════════════════════════════════════
// SHOPPING CATEGORIES
// ══════════════════════════════════════════════════════════

/**
 * Default shopping categories (seeded in database)
 */
export const SHOPPING_CATEGORIES = [
  { name: 'groceries', icon: '🥕', label: 'Spożywcze' },
  { name: 'household', icon: '🧹', label: 'Domowe' },
  { name: 'electronics', icon: '📱', label: 'Elektronika' },
  { name: 'health', icon: '💊', label: 'Zdrowie' },
  { name: 'clothing', icon: '👕', label: 'Odzież' },
  { name: 'kids', icon: '🧸', label: 'Dzieci' },
  { name: 'pets', icon: '🐾', label: 'Zwierzęta' },
  { name: 'garden', icon: '🌱', label: 'Ogród' },
  { name: 'other', icon: '📦', label: 'Inne' },
] as const;

export type ShoppingCategoryName = typeof SHOPPING_CATEGORIES[number]['name'];

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════

/**
 * Main navigation items
 */
export const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    description: 'Przegląd wszystkich tablic',
  },
  {
    href: '/home',
    label: 'Dom',
    icon: 'Home',
    description: 'Tablica domowa (Pomysły → W realizacji → Zrobione)',
  },
  {
    href: '/work',
    label: 'Praca',
    icon: 'Briefcase',
    description: 'Tablica pracowa (Pomysły → Plan → W realizacji → Zrobione)',
  },
  {
    href: '/shopping',
    label: 'Zakupy',
    icon: 'ShoppingCart',
    description: 'Lista zakupów z kategoriami',
  },
  {
    href: '/activity',
    label: 'Aktywność',
    icon: 'Activity',
    description: 'Historia zmian',
  },
] as const;

export type NavItemHref = typeof NAV_ITEMS[number]['href'];

// ══════════════════════════════════════════════════════════
// BOARD TYPES
// ══════════════════════════════════════════════════════════

export const BOARD_TYPES = {
  home: {
    label: 'Dom',
    icon: '🏠',
    columns: HOME_COLUMNS,
    color: '#10B981', // emerald-500
  },
  work: {
    label: 'Praca',
    icon: '💼',
    columns: WORK_COLUMNS,
    color: '#3B82F6', // blue-500
  },
} as const;

export type BoardType = keyof typeof BOARD_TYPES;

// ══════════════════════════════════════════════════════════
// TASK PRIORITIES
// ══════════════════════════════════════════════════════════

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Niski', color: 'text-gray-500', icon: '⚪' },
  { value: 'medium', label: 'Średni', color: 'text-blue-500', icon: '🔵' },
  { value: 'high', label: 'Wysoki', color: 'text-orange-500', icon: '🟠' },
  { value: 'urgent', label: 'Pilny', color: 'text-red-500', icon: '🔴' },
] as const;

export type TaskPriority = typeof TASK_PRIORITIES[number]['value'];

// ══════════════════════════════════════════════════════════
// APP CONFIG
// ══════════════════════════════════════════════════════════

/**
 * Application metadata
 */
export const APP_CONFIG = {
  name: 'Kira Dashboard',
  description: 'Family Task Management with AI',
  version: '0.1.0',
  author: 'CoderMariusz',
  github: 'https://github.com/CoderMariusz/kira-dashboard',
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  webhookPath: '/api/webhook/kira',
  maxRequestSize: '10mb',
  timeout: 30000, // 30s
} as const;

/**
 * Realtime Configuration
 */
export const REALTIME_CONFIG = {
  tables: ['tasks', 'shopping_items', 'activity_log'],
  eventTypes: ['INSERT', 'UPDATE', 'DELETE'],
} as const;

/**
 * Cache Configuration (React Query)
 */
export const CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;
