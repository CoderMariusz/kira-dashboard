# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added (US-5.3 — Mobile-First Responsive Design)
- Mobile-first responsive design across the application
  - Touch targets ≥44px on all interactive elements
  - Responsive typography scale (mobile-first)
  - Swipeable Kanban columns with snap scrolling
  - Bottom sheet modals on mobile (vaul)
  - Pull-to-refresh component
  - Column indicator dots for mobile navigation
  - Shared responsive constants (DRY)
  - No horizontal scroll prevention
- `responsive.ts` — shared responsive design constants (touch targets, layout, typography)
- `ColumnIndicator` component — dot indicators for mobile column navigation
- `BottomSheet` component — responsive modal (drawer on mobile, dialog on desktop)
- `Checkbox` component — touch-friendly checkbox with ≥44px target
- `Radio` component — touch-friendly radio button with ≥44px target
- `PullToRefresh` component — pull-to-refresh gesture wrapper
- `useMediaQuery` hook — responsive media query matching

### Added (US-3.3 — Mark Items as Bought)
- `ShoppingItem` component — shopping item with checkbox toggle and animations
- `useToggleItem` hook — mutation hook for marking items as bought/not bought
- `useDeleteItem` hook — mutation hook for deleting individual items
- PATCH `/api/shopping/items/[id]` endpoint — toggles bought status and updates activity log
- DELETE `/api/shopping/items/[id]` endpoint — deletes shopping items with ownership verification
- Toast notifications for item toggle and deletion actions
- `Toaster` component in dashboard layout for sonner notifications

### Changed (US-3.3)
- `CategoryGroup` component now uses `ShoppingItem` component with animations
- `BoughtSection` component now uses `ShoppingItem` component with collapse animation
- Both components now accept `listId` prop for query invalidation
- `ShoppingList` component passes `listId` to child components

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
