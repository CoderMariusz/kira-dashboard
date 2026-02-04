'use client';

import { motion } from 'framer-motion';
import { useToggleItem } from '@/lib/hooks/useToggleItem';
import { UI_TEXT } from '@/lib/constants/shopping';

interface ShoppingItemProps {
  /** Unique item identifier */
  id: string;
  /** Shopping list ID for invalidating queries */
  listId: string;
  /** Item name */
  name: string;
  /** Quantity (optional, hides if ≤ 1) */
  quantity?: number;
  /** Unit of measurement (e.g., "kg", "l") */
  unit?: string | null;
  /** Category name for display */
  categoryName?: string;
  /** Whether item is marked as bought */
  isBought: boolean;
}

/**
 * Formats quantity display with optional unit.
 * Returns empty string if quantity <= 1.
 */
function formatQuantity(quantity?: number, unit?: string | null): string {
  if (!quantity || quantity <= 1) return '';
  return ` (${quantity}${unit ? ` ${unit}` : ''})`;
}

/**
 * Shopping list item with checkbox toggle.
 * 
 * Displays item name, quantity, and category with animated checkbox.
 * Shows strikethrough and reduced opacity when bought.
 * Handles toggle mutations with loading state.
 * 
 * @component
 * @example
 * ```tsx
 * <ShoppingItem
 *   id="item-123"
 *   listId="list-456"
 *   name="Mleko"
 *   quantity={2}
 *   unit="l"
 *   categoryName="Nabial"
 *   isBought={false}
 * />
 * ```
 */
export function ShoppingItem({
  id,
  listId,
  name,
  quantity,
  unit,
  categoryName,
  isBought,
}: ShoppingItemProps) {
  const { toggle, isPending } = useToggleItem(listId);

  const handleToggle = () => {
    // Toast is now handled in useToggleItem onSuccess/onError callbacks
    toggle(id, isBought, name);
  };

  return (
    <motion.label
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 p-3 bg-gray-50 rounded cursor-pointer ${
        isBought ? 'line-through opacity-60' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={isBought}
        disabled={isPending}
        onChange={handleToggle}
        aria-label={`Oznacz ${name} jako ${isBought ? 'niekupiony' : 'kupiony'}`}
        className="w-4 h-4"
      />
      <div>
        <span>{name}</span>
        <span className="text-muted-foreground">{formatQuantity(quantity, unit)}</span>
        {categoryName && (
          <span className="text-xs text-muted-foreground ml-2">· {categoryName}</span>
        )}
      </div>
      {isPending && <span className="ml-auto">{UI_TEXT.loading}</span>}
    </motion.label>
  );
}
