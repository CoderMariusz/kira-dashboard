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
 */
export const BOARD_LAYOUT = {
  /** Container classes for horizontal scrolling board */
  CONTAINER: 'flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 md:grid md:overflow-x-hidden pb-4',
  
  /** Column classes for swipeable columns on mobile */
  COLUMN: 'flex flex-none w-[90vw] max-w-full snap-center md:w-full md:min-w-[280px] md:flex-1 flex-col',
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
