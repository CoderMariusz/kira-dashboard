# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Shopping list display with categories (US-3.1)
- `useCategories` hook — fetches shopping categories with realtime sync
- `useShopping` hook — fetches shopping items by list with realtime sync
- `CategoryGroup` component — displays items grouped by category
- `BoughtSection` component — collapsible bought items section
- `ShoppingList` component — main shopping list with progress bar
- `LoadingSkeleton` component — animated loading placeholder
- `EmptyState` component — reusable empty state display
- Error state handling for failed data loads
- Real-time sync across browser tabs via Supabase Realtime
