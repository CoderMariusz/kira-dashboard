'use client';

import { memo, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ShoppingCategory, ShoppingItem } from '@/lib/types/database';
import { ShoppingItem as ShoppingItemComponent } from './ShoppingItem';

interface CategoryGroupProps {
  /** Shopping category to display */
  category: ShoppingCategory;
  /** Shopping items to filter by category */
  items: ShoppingItem[];
  /** The shopping list ID */
  listId: string;
}

/**
 * Displays items grouped by a shopping category.
 * 
 * Filters out bought items and shows count. Returns null if no active items exist.
 * 
 * @component
 * @example
 * ```tsx
 * <CategoryGroup category={category} items={items} listId={listId} />
 * ```
 */
export const CategoryGroup = memo(function CategoryGroup({ category, items, listId }: CategoryGroupProps) {
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
      <AnimatePresence>
        <div className="space-y-2">
          {activeItems.map(item => (
            <ShoppingItemComponent
              key={item.id}
              id={item.id}
              listId={listId}
              name={item.name}
              quantity={item.quantity}
              unit={item.unit}
              categoryName={category.name}
              isBought={item.is_bought}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
});
