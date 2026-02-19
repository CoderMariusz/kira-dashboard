// ═══════════════════════════════════════════════════════════
// BOARD COLUMNS — konfiguracja kolumn per typ tablicy
// ═══════════════════════════════════════════════════════════

export const BOARD_COLUMNS = {
  home: [
    { key: 'idea' as const, label: '💡 Pomysły', color: '#F59E0B' },
    { key: 'in_progress' as const, label: '🔄 W realizacji', color: '#3B82F6' },
    { key: 'done' as const, label: '✅ Zrobione', color: '#22C55E' },
  ],
  work: [
    { key: 'idea' as const, label: '💡 Pomysł', color: '#F59E0B' },
    { key: 'plan' as const, label: '📋 Plan', color: '#8B5CF6' },
    { key: 'in_progress' as const, label: '🔄 W realizacji', color: '#3B82F6' },
    { key: 'done' as const, label: '✅ Zrobione', color: '#22C55E' },
  ],
} as const;

// ═══════════════════════════════════════════════════════════
// TASK PRIORITIES
// ═══════════════════════════════════════════════════════════

export const PRIORITIES = {
  low: { label: 'Niski', color: '#6B7280', bgColor: '#F3F4F6' },
  medium: { label: 'Średni', color: '#F59E0B', bgColor: '#FEF3C7' },
  high: { label: 'Wysoki', color: '#EF4444', bgColor: '#FEE2E2' },
  urgent: { label: 'Pilny', color: '#DC2626', bgColor: '#FECACA' },
} as const;

// ═══════════════════════════════════════════════════════════
// DEFAULT SHOPPING CATEGORIES
// ═══════════════════════════════════════════════════════════

export const DEFAULT_SHOPPING_CATEGORIES = [
  { name: 'Owoce i Warzywa', icon: '🥬', color: '#22C55E', position: 1 },
  { name: 'Nabiał', icon: '🥛', color: '#F0F0F0', position: 2 },
  { name: 'Mięso i Ryby', icon: '🥩', color: '#EF4444', position: 3 },
  { name: 'Pieczywo', icon: '🍞', color: '#F59E0B', position: 4 },
  { name: 'Mrożonki', icon: '🧊', color: '#3B82F6', position: 5 },
  { name: 'Napoje', icon: '🥤', color: '#8B5CF6', position: 6 },
  { name: 'Chemia i Higiena', icon: '🧴', color: '#EC4899', position: 7 },
  { name: 'Apteka', icon: '💊', color: '#10B981', position: 8 },
  { name: 'Majsterkowanie', icon: '🔧', color: '#6B7280', position: 9 },
  { name: 'Meble', icon: '🛋️', color: '#D97706', position: 10 },
  { name: 'Inne', icon: '📦', color: '#9CA3AF', position: 99 },
] as const;

// ═══════════════════════════════════════════════════════════
// NAVIGATION ITEMS
// ═══════════════════════════════════════════════════════════

export const NAV_ITEMS = [
  { href: '/home', label: 'Dom', icon: 'Home', emoji: '🏠' },
  { href: '/work', label: 'Praca', icon: 'Briefcase', emoji: '💼' },
  { href: '/shopping', label: 'Zakupy', icon: 'ShoppingCart', emoji: '🛒' },
  { href: '/activity', label: 'Aktywność', icon: 'Activity', emoji: '📊' },
] as const;

// ═══════════════════════════════════════════════════════════
// UNITS (for shopping items)
// ═══════════════════════════════════════════════════════════

export const UNITS = ['szt', 'kg', 'g', 'l', 'ml', 'opak'] as const;
