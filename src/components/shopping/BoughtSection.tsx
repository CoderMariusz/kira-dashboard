import { memo, useMemo } from 'react';
import type { ShoppingItem } from '@/lib/types/database';

interface BoughtSectionProps {
  /** Shopping items to filter for bought items */
  items: ShoppingItem[];
}

/**
 * Collapsible section for purchased items.
 * 
 * Shows bought items (is_bought=true) in a collapsible details element.
 * Returns null if no bought items exist.
 * 
 * @component
 * @example
 * ```tsx
 * <BoughtSection items={items} />
 * ```
 */
export const BoughtSection = memo(function BoughtSection({ items }: BoughtSectionProps) {
  // Memoize filtered items to prevent unnecessary recalculations
  const boughtItems = useMemo(() => items.filter(item => item.is_bought), [items]);
  
  // Return null when no bought items
  if (boughtItems.length === 0) {
    return null;
  }
  
  return (
    <details className="mt-6">
      <summary className="cursor-pointer text-sm text-muted-foreground font-medium">
        Bought items ({boughtItems.length})
      </summary>
      <div className="mt-3 space-y-2">
        {boughtItems.map(item => (
          <div 
            key={item.id} 
            className="p-3 bg-gray-50 rounded line-through opacity-60"
            aria-label={`Bought: ${item.name}`}
          >
            {item.name}
          </div>
        ))}
      </div>
    </details>
  );
});
