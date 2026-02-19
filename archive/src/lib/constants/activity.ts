/**
 * Activity feed constants and configuration.
 * 
 * Centralizes magic strings, entity types, and messages to improve maintainability.
 */

// ══════════════════════════════════════════════════════════
// ENTITY TYPES
// ══════════════════════════════════════════════════════════

/** Entity type values for filtering */
export const ENTITY_TYPES = {
  ALL: 'all',
  TASK: 'task',
  SHOPPING: 'shopping',
  REMINDER: 'reminder',
  BOARD: 'board',
} as const;

/** Entity type for filter dropdown options */
export const ENTITY_TYPE_OPTIONS = [
  { value: ENTITY_TYPES.ALL, label: 'Wszystko' },
  { value: ENTITY_TYPES.TASK, label: 'Zadania' },
  { value: ENTITY_TYPES.SHOPPING, label: 'Zakupy' },
  { value: ENTITY_TYPES.REMINDER, label: 'Przypomnienia' },
  { value: ENTITY_TYPES.BOARD, label: 'Tablice' },
] as const;

/** Entity type icons */
export const ENTITY_ICONS = {
  task: '📋',
  shopping: '🛒',
  reminder: '🔔',
  board: '📊',
} as const;

// ══════════════════════════════════════════════════════════
// ACTOR OPTIONS
// ══════════════════════════════════════════════════════════

/** Actor option values */
export const ACTOR_TYPES = {
  ALL: 'all',
  KIRA: 'kira',
} as const;

// ══════════════════════════════════════════════════════════
// PAGE CONFIGURATION
// ══════════════════════════════════════════════════════════

/** Activity page metadata */
export const PAGE_CONFIG = {
  title: '📊 Aktywność',
  description: 'Historia zmian i aktywności',
} as const;

// ══════════════════════════════════════════════════════════
// UI TEXT
// ══════════════════════════════════════════════════════════

/** UI text labels and messages */
export const UI_TEXT = {
  loadMore: 'Załaduj więcej',
  loading: 'Ładowanie...',
  noActivity: 'Brak aktywności',
  noActivitySubtitle: 'Działania w gospodarstwie pojawią się tutaj',
  errorLoading: 'Wystąpił błąd podczas ładowania aktywności',
  retry: 'Ponów próbę',
  relativeTime: {
    justNow: 'Przed chwilą',
  },
} as const;

// ══════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════

/** Pagination configuration */
export const PAGINATION = {
  PAGE_SIZE: 20,
} as const;
