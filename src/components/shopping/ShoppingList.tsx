'use client';

import { useMemo } from 'react';
import { useShopping } from '@/lib/hooks/useShopping';
import { useCategories } from '@/lib/hooks/useCategories';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { CategoryGroup } from './CategoryGroup';
import { BoughtSection } from './BoughtSection';
import { AddItemForm } from './AddItemForm';

interface ShoppingListProps {
  /** The shopping list's unique identifier */
  listId: string;
}

/**
 * Main shopping list display with categories and progress tracking.
 * 
 * Shows items grouped by category with progress bar. Displays loading skeleton
 * during fetch and empty state when no items exist.
 * 
 * @component
 * @example
 * ```tsx
 * <ShoppingList listId="list-123" />
 * ```
 */
export function ShoppingList({ listId }: ShoppingListProps) {
  const { data: items, isLoading: itemsLoading, error: itemsError } = useShopping(listId);
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();
  
  const isLoading = itemsLoading || categoriesLoading;
  const error = itemsError || categoriesError;
  
  // Memoize computed values (must be before early returns — Rules of Hooks)
  const { boughtCount, totalCount, progressPercent } = useMemo(() => {
    if (!items || items.length === 0) return { boughtCount: 0, totalCount: 0, progressPercent: 0 };
    const bought = items.filter(item => item.is_bought).length;
    const total = items.length;
    return {
      boughtCount: bought,
      totalCount: total,
      progressPercent: total > 0 ? (bought / total) * 100 : 0,
    };
  }, [items]);
  
  // Show loading skeleton
  if (isLoading) {
    return (
      <div>
        <AddItemForm listId={listId} />
        <LoadingSkeleton />
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load shopping list"
        description="Please check your connection and try again"
      />
    );
  }
  
  // Show empty state
  if (!items || items.length === 0) {
    return (
      <div>
        <AddItemForm listId={listId} />
        <EmptyState
          icon="🛒"
          title="No items yet"
          description="Add your first item to get started"
        />
      </div>
    );
  }
  
  return (
    <div>
      {/* Add item form */}
      <AddItemForm listId={listId} />
      
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            {boughtCount} z {totalCount}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div 
          role="progressbar" 
          aria-valuenow={boughtCount} 
          aria-valuemax={totalCount}
          aria-label={`Shopping progress: ${boughtCount} of ${totalCount} items bought`}
          className="h-2 bg-gray-200 rounded-full overflow-hidden"
        >
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      
      {/* Category groups */}
      {categories?.map(category => {
        const categoryItems = items.filter(item => item.category_id === category.id);
        return (
          <CategoryGroup 
            key={category.id} 
            category={category} 
            items={categoryItems} 
          />
        );
      })}
      
      {/* Bought section */}
      <BoughtSection items={items} />
    </div>
  );
}

export default ShoppingList;
