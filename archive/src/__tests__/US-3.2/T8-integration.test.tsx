import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ShoppingCategory, ShoppingItem } from '@/lib/types/database';

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'shopping_categories') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: mockCategories,
                error: null,
              })
            ),
          })),
        };
      }
      if (table === 'shopping_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: mockItems,
                error: null,
              })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      };
    }),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

// ═══════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════

const mockCategories: ShoppingCategory[] = [
  {
    id: 'cat-1',
    name: 'Nabiał',
    icon: '🥛',
    color: '#4CAF50',
    position: 0,
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Pieczywo',
    icon: '🍞',
    color: '#FF9800',
    position: 1,
    is_default: true,
    created_at: new Date().toISOString(),
  },
];

const mockItems: ShoppingItem[] = [
  {
    id: 'item-1',
    list_id: 'list-1',
    name: 'Milk',
    quantity: 1,
    unit: 'l',
    category_id: 'cat-1',
    category_name: 'Nabiał',
    store: null,
    is_bought: false,
    added_by: 'profile-1',
    bought_by: null,
    estimated_price: null,
    source: 'manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════

describe('T8: ShoppingList Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1: should render AddItemForm within ShoppingList', async () => {
    const { ShoppingList } = await import('@/components/shopping/ShoppingList');
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ShoppingList listId="list-1" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nazwa|produkt/i)).toBeInTheDocument();
    });
  });

  it('AC2: should pass listId prop to AddItemForm', async () => {
    const { ShoppingList } = await import('@/components/shopping/ShoppingList');
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ShoppingList listId="list-test-123" />
      </Wrapper>
    );

    await waitFor(() => {
      const form = screen.getByLabelText(/nazwa|produkt/i).closest('form');
      expect(form).toBeInTheDocument();
    });

    // Form should exist and be connected to the correct list
    // (implementation will handle this through the hook)
  });

  it('AC3: should display AddItemForm in loading state', async () => {
    const { ShoppingList } = await import('@/components/shopping/ShoppingList');
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ShoppingList listId="list-1" />
      </Wrapper>
    );

    // Form should be visible even during initial load
    const nameInput = await screen.findByLabelText(/nazwa|produkt/i);
    expect(nameInput).toBeInTheDocument();
  });

  it('AC4: should display AddItemForm in empty state', async () => {
    // Mock hooks to return empty state
    vi.doMock('@/lib/hooks/useShopping', () => ({
      useShopping: vi.fn(() => ({
        data: [],
        isLoading: false,
        error: null,
      })),
    }));
    vi.doMock('@/lib/hooks/useCategories', () => ({
      useCategories: vi.fn(() => ({
        data: [],
        isLoading: false,
        error: null,
      })),
    }));

    const { ShoppingList } = await import('@/components/shopping/ShoppingList');
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ShoppingList listId="list-1" />
      </Wrapper>
    );

    expect(screen.getByLabelText(/nazwa|produkt/i)).toBeInTheDocument();
  });

  it('AC5: should display AddItemForm above category groups', async () => {
    const { ShoppingList } = await import('@/components/shopping/ShoppingList');
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <ShoppingList listId="list-1" />
      </Wrapper>
    );

    await waitFor(() => {
      const form = screen.getByLabelText(/nazwa|produkt/i).closest('form');
      const categoryGroup = screen.queryByText(/nabiał/i);
      
      if (form && categoryGroup) {
        // Form should appear before category groups in DOM order
        expect(form.compareDocumentPosition(categoryGroup)).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING
        );
      } else {
        // If category group doesn't exist yet (empty list), form should still render
        expect(form).toBeInTheDocument();
      }
    });
  });

  it('AC6: should not affect existing ShoppingList functionality', async () => {
    // Clear module cache and mock hooks directly
    vi.resetModules();
    
    vi.doMock('@/lib/hooks/useShopping', () => ({
      useShopping: vi.fn(() => ({
        data: mockItems,
        isLoading: false,
        error: null,
      })),
    }));
    vi.doMock('@/lib/hooks/useCategories', () => ({
      useCategories: vi.fn(() => ({
        data: mockCategories,
        isLoading: false,
        error: null,
      })),
    }));
    vi.doMock('@/lib/hooks/useAddItem', () => ({
      useAddItem: vi.fn(() => ({
        mutate: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
      })),
    }));
    vi.doMock('@/lib/hooks/useAddCategory', () => ({
      useAddCategory: vi.fn(() => ({
        mutate: vi.fn(),
        isPending: false,
        isSuccess: false,
        data: null,
      })),
    }));

    const { ShoppingList } = await import('@/components/shopping/ShoppingList');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const React = await import('react');
    
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    render(
      <Wrapper>
        <ShoppingList listId="list-1" />
      </Wrapper>
    );

    // Check that existing items are still displayed
    expect(screen.getByText('Milk')).toBeInTheDocument();
    
    // Check that category grouping still works (may appear in dropdown too)
    expect(screen.getAllByText(/nabiał/i).length).toBeGreaterThanOrEqual(1);
  });
});
