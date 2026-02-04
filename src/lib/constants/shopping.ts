/**
 * Shopping list constants and configuration.
 * 
 * Centralizes magic strings, URLs, and messages to improve maintainability.
 */

// ══════════════════════════════════════════════════════════
// API ENDPOINTS
// ══════════════════════════════════════════════════════════

/** API endpoint builders for shopping operations */
export const API_ENDPOINTS = {
  /** Item PATCH/DELETE endpoint */
  shoppingItem: (id: string) => `/api/shopping/items/${id}`,
  /** List GET endpoint */
  shoppingList: (listId: string) => `/api/shopping/lists/${listId}`,
  /** Categories GET endpoint */
  shoppingCategories: '/api/shopping/categories',
} as const;

// ══════════════════════════════════════════════════════════
// TOAST MESSAGES
// ══════════════════════════════════════════════════════════

/** Toast notification messages for user feedback */
export const TOAST_MESSAGES = {
  itemMarkedBought: (name: string) => `✅ ${name} kupiony`,
  itemMarkedNotBought: (name: string) => `🔄 ${name} z powrotem na liście`,
  itemDeleted: (name: string) => `🗑️ ${name} usunięty`,
  itemsCleared: 'Kupione produkty zostały wyczyszczone',
  errorToggling: 'Nie udało się zmienić statusu produktu',
  errorDeleting: 'Nie udało się usunąć produktu',
  errorClearing: 'Nie udało się wyczyścić kupionych produktów',
} as const;

// ══════════════════════════════════════════════════════════
// CONFIRMATION MESSAGES
// ══════════════════════════════════════════════════════════

/** Confirmation dialog messages */
export const CONFIRM_MESSAGES = {
  clearBoughtItems: 'Czy na pewno chcesz usunąć wszystkie kupione produkty?',
  deleteItem: (name: string) => `Czy na pewno chcesz usunąć "${name}"?`,
} as const;

// ══════════════════════════════════════════════════════════
// UI TEXT
// ══════════════════════════════════════════════════════════

/** UI text labels and indicators */
export const UI_TEXT = {
  clearing: 'Czyszczenie...',
  clear: 'Wyczyść',
  bought: 'Kupione',
  loading: '⏳',
} as const;
