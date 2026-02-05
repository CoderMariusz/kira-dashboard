/**
 * Responsive design constants for US-5.3
 * Extracted to follow DRY principle
 */

/**
 * Touch-friendly minimum target size (44x44px iOS, 48x48px Android)
 * Using 44px as baseline
 */
export const TOUCH_TARGET = {
  /** Tailwind class for minimum touch height: h-11 (44px) */
  HEIGHT: 'h-11',
  /** Tailwind class for square touch target: h-11 w-11 */
  SQUARE: 'h-11 w-11',
  /** Tailwind class for form label minimum height */
  MIN_HEIGHT: 'min-h-[44px]',
} as const;

/**
 * Kanban board layout classes
 * Shared between Board and BoardSkeleton for consistency
 *
 * Layout strategy:
 * - Small phones (<640px): columns stack vertically, full width
 * - Larger phones/tablets (640-1024px): horizontal scroll with snap
 * - Desktop (1024px+): CSS grid, all columns visible side by side
 */
export const BOARD_LAYOUT = {
  /** Container: vertical stack → horizontal scroll → grid */
  CONTAINER: 'flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:snap-x sm:snap-mandatory sm:scrollbar-hide sm:gap-4 lg:grid lg:overflow-x-hidden pb-4',
  
  /** Column: full width stacked → swipeable → grid cell */
  COLUMN: 'flex flex-col sm:flex-none sm:w-[85vw] sm:max-w-full sm:snap-center lg:w-full lg:min-w-[200px] lg:flex-1',
} as const;

/**
 * Responsive typography scale
 * Mobile-first with desktop refinements
 */
export const RESPONSIVE_TEXT = {
  /** Base text: text-base md:text-sm */
  BASE: 'text-base md:text-sm',
  /** Small text: text-sm md:text-xs */
  SMALL: 'text-sm md:text-xs',
  /** Heading 2: text-xl md:text-2xl */
  H2: 'text-xl md:text-2xl',
  /** Dialog title: text-2xl md:text-3xl lg:text-4xl */
  DIALOG_TITLE: 'text-2xl md:text-3xl lg:text-4xl',
} as const;
