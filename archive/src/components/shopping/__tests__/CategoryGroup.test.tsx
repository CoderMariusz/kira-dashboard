import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryGroup } from '../CategoryGroup';
import type { ShoppingItem, ShoppingCategory } from '@/lib/types/database';

// Mock ShoppingItem (added in US-3.3 — uses hooks that need QueryClient)
vi.mock('@/components/shopping/ShoppingItem', () => ({
  ShoppingItem: ({ name }: any) => (
    <div data-testid="shopping-item">{name}</div>
  ),
}));

// Mock framer-motion (added in US-3.3)
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => children,
}));

const mockCategory: ShoppingCategory = {
  id: 'cat-1',
  name: 'Owoce i warzywa',
  icon: '🍎',
  color: '#22c55e',
  position: 1,
  is_default: true,
  created_at: '2024-01-01',
};

const mockItems: ShoppingItem[] = [
  {
    id: '1',
    list_id: 'list-1',
    name: 'Jabłka',
    quantity: 2,
    unit: 'kg',
    category_id: 'cat-1',
    category_name: 'Owoce i warzywa',
    store: null,
    is_bought: false,
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '2',
    list_id: 'list-1',
    name: 'Banany',
    quantity: 1,
    unit: 'kg',
    category_id: 'cat-1',
    category_name: 'Owoce i warzywa',
    store: null,
    is_bought: true, // bought item — should be filtered out
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

describe('CategoryGroup (T4)', () => {
  // T4/AC1: Filters out bought items (is_bought=false only)
  it('displays only active items (is_bought=false)', () => {
    render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />);
    
    expect(screen.getByText('Jabłka')).toBeInTheDocument();
    expect(screen.queryByText('Banany')).not.toBeInTheDocument();
  });

  // T4/AC2: Returns null when no active items
  it('returns null when all items are bought', () => {
    const boughtItems = mockItems.map(item => ({ ...item, is_bought: true }));
    const { container } = render(<CategoryGroup category={mockCategory} items={boughtItems} listId="list-1" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('returns null when items array is empty', () => {
    const { container } = render(<CategoryGroup category={mockCategory} items={[]} listId="list-1" />);
    
    expect(container.firstChild).toBeNull();
  });

  // T4/AC3: Displays category icon, name, and item count
  it('displays category icon and name', () => {
    render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />);
    
    expect(screen.getByText('🍎')).toBeInTheDocument();
    expect(screen.getByText('Owoce i warzywa')).toBeInTheDocument();
  });

  it('displays active item count', () => {
    render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />);
    
    // Should show 1 (only 1 active item)
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });

  it('displays items in a list', () => {
    render(<CategoryGroup category={mockCategory} items={mockItems} listId="list-1" />);
    
    const itemElement = screen.getByText('Jabłka');
    expect(itemElement).toBeInTheDocument();
  });
});
