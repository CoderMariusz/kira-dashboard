import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T4: Create Shopping Components
 * Tests for CategoryGroup, BoughtSection, and ShoppingList components
 */

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

// Mock Supabase client for ShoppingList tests (hooks use it internally)
const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: table === 'shopping_categories' ? [
            { 
              id: 'cat-1', 
              name: 'Vegetables', 
              icon: '🥕', 
              color: '#4CAF50', 
              position: 0, 
              is_default: true,
              created_at: new Date().toISOString(),
            },
          ] : [],
          error: null,
        })),
        eq: vi.fn(() => Promise.resolve({
          data: [
            { 
              id: '1', 
              name: 'Tomatoes', 
              category_id: 'cat-1',
              category_name: 'Vegetables',
              is_bought: false, 
              quantity: 2,
              unit: null,
              list_id: 'list-1',
              store: null,
              added_by: null,
              bought_by: null,
              estimated_price: null,
              source: 'manual',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { 
              id: '2', 
              name: 'Cucumbers', 
              category_id: 'cat-1',
              category_name: 'Vegetables',
              is_bought: false, 
              quantity: 3,
              unit: null,
              list_id: 'list-1',
              store: null,
              added_by: null,
              bought_by: null,
              estimated_price: null,
              source: 'manual',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { 
              id: '3', 
              name: 'Carrots', 
              category_id: 'cat-1',
              category_name: 'Vegetables',
              is_bought: true, 
              quantity: 1,
              unit: null,
              list_id: 'list-1',
              store: null,
              added_by: null,
              bought_by: null,
              estimated_price: null,
              source: 'manual',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          error: null,
        })),
      })),
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockCategory = {
  id: 'cat-1',
  name: 'Vegetables',
  icon: '🥕',
  color: '#4CAF50',
  position: 0,
  is_default: false,
  created_at: new Date().toISOString(),
};

const mockItems = [
  {
    id: '1',
    name: 'Tomatoes',
    category_id: 'cat-1',
    category_name: 'Vegetables',
    is_bought: false,
    quantity: 2,
    unit: null,
    list_id: 'list-1',
    store: null,
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Cucumbers',
    category_id: 'cat-1',
    category_name: 'Vegetables',
    is_bought: false,
    quantity: 3,
    unit: null,
    list_id: 'list-1',
    store: null,
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Carrots',
    category_id: 'cat-1',
    category_name: 'Vegetables',
    is_bought: true,
    quantity: 1,
    unit: null,
    list_id: 'list-1',
    store: null,
    added_by: null,
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('T4: Shopping Components', () => {
  describe('CategoryGroup', () => {
    it('AC1: should filter out bought items (is_bought=false only)', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      render(
        <CategoryGroup
          category={mockCategory}
          items={mockItems}
          listId="list-1"
        />
      );

      // Should show only unbought items
      expect(screen.getByText('Tomatoes')).toBeInTheDocument();
      expect(screen.getByText('Cucumbers')).toBeInTheDocument();
      expect(screen.queryByText('Carrots')).not.toBeInTheDocument(); // bought item
    });

    it('AC2: should return null when no active items', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      const allBoughtItems = mockItems.map(item => ({ ...item, is_bought: true }));

      const { container } = render(
        <CategoryGroup
          category={mockCategory}
          items={allBoughtItems}
          listId="list-1"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('AC3: should display category icon, name, and item count', async () => {
      const { CategoryGroup } = await import('@/components/shopping/CategoryGroup');

      render(
        <CategoryGroup
          category={mockCategory}
          items={mockItems}
          listId="list-1"
        />
      );

      // Should show icon and name
      expect(screen.getByText('🥕')).toBeInTheDocument();
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
      
      // Should show count of active items (2 unbought) - look in the header area
      const header = screen.getByText('Vegetables').closest('div')!;
      expect(within(header).getByText(/\(2\)/)).toBeInTheDocument();
    });
  });

  describe('BoughtSection', () => {
    it('AC4: should display only bought items (is_bought=true)', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');

      const Wrapper = createWrapper();
      render(<Wrapper><BoughtSection items={mockItems} listId="list-1" /></Wrapper>);

      // Should show only bought items
      expect(screen.getByText('Carrots')).toBeInTheDocument();
      expect(screen.queryByText('Tomatoes')).not.toBeInTheDocument();
      expect(screen.queryByText('Cucumbers')).not.toBeInTheDocument();
    });

    it('AC5: should be collapsed by default (details without open)', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');

      const Wrapper = createWrapper();
      const { container } = render(<Wrapper><BoughtSection items={mockItems} listId="list-1" /></Wrapper>);

      // Should use <details> element
      const details = container.querySelector('details');
      expect(details).toBeInTheDocument();
      expect(details).not.toHaveAttribute('open');
    });

    it('AC6: should return null when no bought items', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');

      const unboughtItems = mockItems.map(item => ({ ...item, is_bought: false }));

      const Wrapper = createWrapper();
      const { container } = render(<Wrapper><BoughtSection items={unboughtItems} listId="list-1" /></Wrapper>);

      expect(container.querySelector('details')).toBeNull();
    });
  });

  describe('ShoppingList', () => {
    it('AC7: should calculate progress with bought/total ratio', async () => {
      const { ShoppingList } = await import('@/components/shopping/ShoppingList');
      const Wrapper = createWrapper();

      render(<Wrapper><ShoppingList listId="list-1" /></Wrapper>);

      // Mock data has 1 bought out of 3 total
      // Progress should show "1 z 3"
      const progressText = await screen.findByText(/1 z 3/);
      expect(progressText).toBeInTheDocument();
    });

    it('AC7b: should handle zero-division safety when no items', async () => {
      const { ShoppingList } = await import('@/components/shopping/ShoppingList');

      // Mock empty list response
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ShoppingList listId="empty-list" /></Wrapper>);

      // Should show empty state without crashing (no zero-division)
      const emptyState = await screen.findByText(/No items yet/i);
      expect(emptyState).toBeInTheDocument();
    });

    it('AC8: should show LoadingSkeleton when loading', async () => {
      const { ShoppingList } = await import('@/components/shopping/ShoppingList');
      const Wrapper = createWrapper();

      render(<Wrapper><ShoppingList listId="list-1" /></Wrapper>);

      // Should show loading skeleton while fetching
      expect(screen.getByTestId('skeleton-progress-bar')).toBeInTheDocument();
    });

    it('AC9: should show EmptyState when items.length === 0', async () => {
      const { ShoppingList } = await import('@/components/shopping/ShoppingList');

      // Mock empty list response
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ShoppingList listId="empty-list" /></Wrapper>);

      // Should show empty state
      const emptyState = await screen.findByText(/No items yet/i);
      expect(emptyState).toBeInTheDocument();
    });

    it('AC10: progress bar should display "{bought} z {total}" text and visual bar', async () => {
      const { ShoppingList } = await import('@/components/shopping/ShoppingList');

      // Restore mock with data (may have been overridden by previous tests)
      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: table === 'shopping_categories' ? [
                { id: 'cat-1', name: 'Vegetables', icon: '🥕', color: '#4CAF50', position: 0, is_default: true },
              ] : [],
              error: null,
            })),
            eq: vi.fn(() => Promise.resolve({
              data: [
                { id: '1', name: 'Tomatoes', category_id: 'cat-1', is_bought: false, quantity: 2, list_id: 'list-1' },
                { id: '2', name: 'Cucumbers', category_id: 'cat-1', is_bought: false, quantity: 3, list_id: 'list-1' },
                { id: '3', name: 'Carrots', category_id: 'cat-1', is_bought: true, quantity: 1, list_id: 'list-1' },
              ],
              error: null,
            })),
          })),
        })),
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ShoppingList listId="list-1" /></Wrapper>);

      // Should show text format
      const progressText = await screen.findByText(/\d+ z \d+/);
      expect(progressText).toBeInTheDocument();

      // Should show visual progress bar element
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });
});
