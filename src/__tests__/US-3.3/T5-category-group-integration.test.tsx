import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ═══════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════

// Mock ShoppingItem component (lesson 12: mock new sub-dependencies)
vi.mock('@/components/shopping/ShoppingItem', () => ({
  ShoppingItem: vi.fn(({ id, name, isBought }: any) => (
    <div data-testid={`shopping-item-${id}`}>
      {name} - {isBought ? 'bought' : 'active'}
    </div>
  )),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

// ═══════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════

const mockCategory = {
  id: 'cat-1',
  name: 'Vegetables',
  icon: '🥕',
  color: '#4CAF50',
  position: 0,
  is_default: true,
  created_at: '2024-01-01T00:00:00Z',
};

const mockItems = [
  {
    id: 'item-1',
    list_id: 'list-1',
    name: 'Tomatoes',
    quantity: 2,
    unit: 'kg',
    category_id: 'cat-1',
    category_name: 'Vegetables',
    store: null,
    is_bought: false,
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'item-2',
    list_id: 'list-1',
    name: 'Carrots',
    quantity: 1,
    unit: 'kg',
    category_id: 'cat-1',
    category_name: 'Vegetables',
    store: null,
    is_bought: false,
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('T5: CategoryGroup Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Render ShoppingItem instead of plain divs', () => {
    it('should render ShoppingItem components for each active item', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />);

      // Should render ShoppingItem for each item
      expect(screen.getByTestId('shopping-item-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-item-item-2')).toBeInTheDocument();
    });

    it('should NOT render plain divs with item content', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      const { container } = render(
        <CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />
      );

      // Should not have old structure (plain divs with bg-gray-50)
      const plainDivs = container.querySelectorAll('.bg-gray-50');
      expect(plainDivs.length).toBe(0);
    });
  });

  describe('AC2: Wrap items with AnimatePresence', () => {
    it('should wrap item list with AnimatePresence component', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />);

      // Should have AnimatePresence wrapper
      expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    });
  });

  describe('AC3: Pass all required props to ShoppingItem', () => {
    it('should pass id, listId, name, quantity, unit, categoryName, isBought to ShoppingItem', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      const ShoppingItemSpy = vi.mocked(ShoppingItem);

      render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />);

      // Verify ShoppingItem was called with correct props
      expect(ShoppingItemSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'item-1',
          listId: 'list-1',
          name: 'Tomatoes',
          quantity: 2,
          unit: 'kg',
          categoryName: 'Vegetables',
          isBought: false,
        }),
        undefined // React 19: no ref forwarding as 2nd arg
      );
    });
  });

  describe('AC4: Accept listId prop', () => {
    it('should accept and use listId prop', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      // Should not throw when passing listId prop
      expect(() => {
        render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-2" />);
      }).not.toThrow();
    });
  });

  describe('Regression: Existing behavior preserved', () => {
    it('should still filter out bought items', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      const itemsWithBought = [
        ...mockItems,
        {
          id: 'item-3',
          list_id: 'list-1',
          name: 'Potatoes',
          quantity: 3,
          unit: 'kg',
          category_id: 'cat-1',
          category_name: 'Vegetables',
          store: null,
          is_bought: true, // BOUGHT
          added_by: null,
          bought_by: 'profile-1',
          estimated_price: null,
          source: 'manual',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      render(<CategoryGroup category={mockCategory} items={itemsWithBought} listId="list-1" />);

      // Should only render active items (not bought)
      expect(screen.getByTestId('shopping-item-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-item-item-2')).toBeInTheDocument();
      expect(screen.queryByTestId('shopping-item-item-3')).not.toBeInTheDocument();
    });

    it('should return null when no active items exist', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      const boughtItems = [
        {
          ...mockItems[0],
          is_bought: true,
        },
      ];

      const { container } = render(
        <CategoryGroup category={mockCategory} items={boughtItems} listId="list-1" />
      );

      // Should render nothing
      expect(container.firstChild).toBeNull();
    });

    it('should still show category header with icon and count', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />);

      // Should show category name, icon, and count
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
      expect(screen.getByText('🥕')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });
});
