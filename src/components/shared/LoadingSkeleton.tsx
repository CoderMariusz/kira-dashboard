/**
 * Animated loading placeholder for shopping list.
 * 
 * Displays skeleton content with pulsing animation while data loads.
 * 
 * @component
 * @example
 * ```tsx
 * <LoadingSkeleton />
 * ```
 */
export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Progress bar skeleton */}
      <div data-testid="skeleton-progress-bar" className="h-8 bg-gray-200 rounded animate-pulse" />
      
      {/* Category group skeletons */}
      <div data-testid="skeleton-category-group" className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
      </div>
      
      <div data-testid="skeleton-category-group" className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
      </div>
      
      <div data-testid="skeleton-category-group" className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
