'use client';

import { memo, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { ShoppingItem } from '@/lib/types/database';
import { ShoppingItem as ShoppingItemComponent } from './ShoppingItem';
import { API_ENDPOINTS, CONFIRM_MESSAGES, TOAST_MESSAGES, UI_TEXT } from '@/lib/constants/shopping';

interface BoughtSectionProps {
  /** Shopping items to filter for bought items */
  items: ShoppingItem[];
  /** The shopping list ID */
  listId: string;
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
 * <BoughtSection items={items} listId={listId} />
 * ```
 */
export const BoughtSection = memo(function BoughtSection({ items, listId }: BoughtSectionProps) {
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);
  
  // Memoize filtered items to prevent unnecessary recalculations
  const boughtItems = useMemo(() => items.filter(item => item.is_bought), [items]);
  
  // Return null when no bought items
  if (boughtItems.length === 0) {
    return null;
  }
  
  const handleClear = async () => {
    if (!confirm(CONFIRM_MESSAGES.clearBoughtItems)) {
      return;
    }
    
    setIsClearing(true);
    
    try {
      const results = await Promise.allSettled(
        boughtItems.map(item =>
          fetch(API_ENDPOINTS.shoppingItem(item.id), {
            method: 'DELETE',
          }).then(res => { if (!res.ok) throw new Error(`Delete failed for ${item.id}`); })
        )
      );
      
      const failed = results.filter(r => r.status === 'rejected').length;
      // Invalidate cache so UI updates immediately
      await queryClient.invalidateQueries({ queryKey: ['shopping', listId] });
      if (failed > 0) {
        toast.error(`Nie udało się usunąć ${failed} z ${boughtItems.length} produktów`);
      } else {
        toast.success(TOAST_MESSAGES.itemsCleared);
      }
    } catch (error) {
      console.error('Failed to clear bought items:', error);
      toast.error(TOAST_MESSAGES.errorClearing);
    } finally {
      setIsClearing(false);
    }
  };
  
  return (
    <details className="mt-6">
      <summary className="cursor-pointer text-sm text-muted-foreground font-medium">
        {UI_TEXT.bought} ({boughtItems.length})
        <button
          onClick={(e) => {
            e.preventDefault();
            handleClear();
          }}
          disabled={isClearing}
          className="ml-4 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {isClearing ? UI_TEXT.clearing : UI_TEXT.clear}
        </button>
      </summary>
      <AnimatePresence>
        <div className="mt-3 space-y-2">
          {boughtItems.map(item => (
            <ShoppingItemComponent
              key={item.id}
              id={item.id}
              listId={listId}
              name={item.name}
              quantity={item.quantity}
              unit={item.unit}
              categoryName={item.category_name}
              isBought={item.is_bought}
            />
          ))}
        </div>
      </AnimatePresence>
    </details>
  );
});
