import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ═══════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════

// Mock hooks (lesson 11: mock hooks that chain to Supabase)
vi.mock('@/lib/hooks/useShopping', () => ({
  useShopping: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/lib/hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}));

// Mock sub-components (lesson 12)
vi.mock('@/components/shopping/CategoryGroup', () => ({
  CategoryGroup: ({ category, items, listId }: any) => (
    <div data-testid={`category-group-${category.id}`} data-list-id={listId}>
      CategoryGroup: {category.name}
    </div>
  ),
}));

vi.mock('@/components/shopping/BoughtSection', () => ({
  BoughtSection: ({ items, listId }: any) => (
    <div data-testid="bought-section" data-list-id={listId}>
      BoughtSection ({items.length} items)
    </div>
  ),
}));

vi.mock('@/components/shopping/AddItemForm', () => ({
  AddItemForm: ({ listId }: any) => (
    <div data-testid="add-item-form" data-list-id={listId}>
      AddItemForm
    </div>
  ),
}));

vi.mock('@/components/shared/LoadingSkeleton', () => ({
  LoadingSkeleton: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

vi.mock('@/components/shared/EmptyState', () => ({
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Vegetables',
    icon: '🥕',
    color: '#4CAF50',
    position: 0,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Dairy',
    icon: '🥛',
    color: '#3b82f6',
    position: 1,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

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
];

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('T9: ShoppingList Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Pass listId to CategoryGroup', () => {
    it('should pass listId prop to CategoryGroup components', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');
      const { useCategories } = await import('@/lib/hooks/useCategories');

      vi.mocked(useShopping).mockReturnValue({
        data: mockItems,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { ShoppingList } = await import('@/components/shopping/ShoppingList');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ShoppingList listId="list-1" />
        </Wrapper>
      );

      const categoryGroup = screen.getByTestId('category-group-cat-1');
      expect(categoryGroup).toHaveAttribute('data-list-id', 'list-1');
    });
  });

  describe('AC2: Pass listId to BoughtSection', () => {
    it('should pass listId prop to BoughtSection component', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');
      const { useCategories } = await import('@/lib/hooks/useCategories');

      vi.mocked(useShopping).mockReturnValue({
        data: mockItems,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { ShoppingList } = await import('@/components/shopping/ShoppingList');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ShoppingList listId="list-1" />
        </Wrapper>
      );

      const boughtSection = screen.getByTestId('bought-section');
      expect(boughtSection).toHaveAttribute('data-list-id', 'list-1');
    });
  });

  describe('AC3: No regression in existing tests', () => {
    it('should still show loading skeleton when loading', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');
      const { useCategories } = await import('@/lib/hooks/useCategories');

      vi.mocked(useShopping).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      vi.mocked(useCategories).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      const { ShoppingList } = await import('@/components/shopping/ShoppingList');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ShoppingList listId="list-1" />
        </Wrapper>
      );

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should still show empty state when no items', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');
      const { useCategories } = await import('@/lib/hooks/useCategories');

      vi.mocked(useShopping).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { ShoppingList } = await import('@/components/shopping/ShoppingList');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ShoppingList listId="list-1" />
        </Wrapper>
      );

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('should still show progress bar', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');
      const { useCategories } = await import('@/lib/hooks/useCategories');

      vi.mocked(useShopping).mockReturnValue({
        data: mockItems,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { ShoppingList } = await import('@/components/shopping/ShoppingList');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ShoppingList listId="list-1" />
        </Wrapper>
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should still render AddItemForm', async () => {
      const { useShopping } = await import('@/lib/hooks/useShopping');
      const { useCategories } = await import('@/lib/hooks/useCategories');

      vi.mocked(useShopping).mockReturnValue({
        data: mockItems,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { ShoppingList } = await import('@/components/shopping/ShoppingList');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <ShoppingList listId="list-1" />
        </Wrapper>
      );

      expect(screen.getByTestId('add-item-form')).toBeInTheDocument();
    });
  });
});
