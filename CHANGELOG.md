# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added (US-3.2 — Add Shopping Items)
- `AddItemForm` component — form for adding items with category selection and auto-detection
- `AddCategoryModal` component — modal for creating custom shopping categories
- `useAddItem` hook — mutation hook with optimistic updates and auto-category detection
- `useAddCategory` hook — mutation hook for custom category creation
- `useFormReset` hook — reusable form reset logic for mutations
- POST `/api/shopping/items` endpoint — creates shopping items with activity logging
- POST `/api/shopping/categories` endpoint — creates custom shopping categories
- `detectCategory()` utility — auto-detects product categories from keywords (135+ keywords)
- `authenticateAndGetProfile()` utility — shared auth logic for API routes (eliminates duplication)
- `sanitizeText()` and `sanitizeColor()` utilities — input validation and sanitization
- Activity logging for all shopping item creations
- Optimistic UI updates for instant item creation feedback

### Changed (US-3.2)
- `ShoppingList` component now includes `AddItemForm` for inline item creation
- Enhanced error handling with user-friendly error messages

### Added (US-3.1 — Shopping List Display)
- Shopping list display with categories
- `useCategories` hook — fetches shopping categories with realtime sync
- `useShopping` hook — fetches shopping items by list with realtime sync
- `CategoryGroup` component — displays items grouped by category
- `BoughtSection` component — collapsible bought items section
- `LoadingSkeleton` component — animated loading placeholder
- `EmptyState` component — reusable empty state display
- Error state handling for failed data loads
- Real-time sync across browser tabs via Supabase Realtime
