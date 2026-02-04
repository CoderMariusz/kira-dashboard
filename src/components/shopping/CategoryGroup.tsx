import { memo, useMemo } from 'react';
import type { ShoppingCategory, ShoppingItem } from '@/lib/types/database';

interface CategoryGroupProps {
  /** Shopping category to display */
  category: ShoppingCategory;
  /** Shopping items to filter by category */
  items: ShoppingItem[];
}

/**
 * Displays items grouped by a shopping category.
 * 
 * Filters out bought items and shows count. Returns null if no active items exist.
 * 
 * @component
 * @example
 * ```tsx
 * <CategoryGroup category={category} items={items} />
 * ```
 */
export const CategoryGroup = memo(function CategoryGroup({ category, items }: CategoryGroupProps) {
  // Memoize filtered items to prevent unnecessary recalculations
  const activeItems = useMemo(() => items.filter(item => !item.is_bought), [items]);
  
  // Return null when no active items
  if (activeItems.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" aria-hidden="true">{category.icon}</span>
        <h3 className="text-lg font-semibold">{category.name}</h3>
        <span className="text-sm text-muted-foreground" aria-label={`${activeItems.length} items`}>
          ({activeItems.length})
        </span>
      </div>
      <div className="space-y-2">
        {activeItems.map(item => (
          <div key={item.id} className="p-3 bg-gray-50 rounded">
            <span>{item.name}</span>
            {item.quantity > 1 && <span className="text-muted-foreground"> ({item.quantity})</span>}
          </div>
        ))}
      </div>
    </div>
  );
});
