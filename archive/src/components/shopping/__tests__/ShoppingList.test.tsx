import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShoppingList } from '../ShoppingList';
import { useShopping } from '@/lib/hooks/useShopping';
import { useCategories } from '@/lib/hooks/useCategories';
import type { ReactNode } from 'react';

const mockListId = 'test-list-123';

// Mock AddItemForm to avoid its dependency chain
vi.mock('@/components/shopping/AddItemForm', () => ({
  AddItemForm: ({ listId }: { listId: string }) => (
    <div data-testid="add-item-form">AddItemForm for {listId}</div>
  ),
}));

// Mock hooks
vi.mock('@/lib/hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    data: [
      { id: 'cat-1', name: 'Owoce', icon: '🍎', color: '#22c55e', position: 1 },
      { id: 'cat-2', name: 'Nabiał', icon: '🥛', color: '#3b82f6', position: 2 },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/lib/hooks/useShopping', () => ({
  useShopping: vi.fn(() => ({
    data: [
      { id: '1', name: 'Jabłka', category_id: 'cat-1', is_bought: false },
      { id: '2', name: 'Mleko', category_id: 'cat-2', is_bought: false },
      { id: '3', name: 'Banany', category_id: 'cat-1', is_bought: true },
    ],
    isLoading: false,
  })),
}));

const mockedUseShopping = vi.mocked(useShopping);
const mockedUseCategories = vi.mocked(useCategories);

describe('ShoppingList (T4)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // Reset to defaults
    mockedUseShopping.mockReturnValue({
      data: [
        { id: '1', name: 'Jabłka', category_id: 'cat-1', is_bought: false },
        { id: '2', name: 'Mleko', category_id: 'cat-2', is_bought: false },
        { id: '3', name: 'Banany', category_id: 'cat-1', is_bought: true },
      ],
      isLoading: false,
    } as any);
    mockedUseCategories.mockReturnValue({
      data: [
        { id: 'cat-1', name: 'Owoce', icon: '🍎', color: '#22c55e', position: 1 },
        { id: 'cat-2', name: 'Nabiał', icon: '🥛', color: '#3b82f6', position: 2 },
      ],
      isLoading: false,
    } as any);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  // T4/AC7: Calculates progress: bought/total with zero-division safety
  it('calculates progress as bought/total', () => {
    render(<ShoppingList listId={mockListId} />, { wrapper });
    
    // 1 bought out of 3 total = "1 z 3"
    expect(screen.getByText(/1 z 3/)).toBeInTheDocument();
  });

  it('handles zero items (zero-division safety)', () => {
    mockedUseShopping.mockReturnValue({ data: [], isLoading: false } as any);
    
    render(<ShoppingList listId={mockListId} />, { wrapper });
    
    // Empty state shown - no crash
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
  });

  // T4/AC8: Shows LoadingSkeleton when loading
  it('displays LoadingSkeleton when loading', () => {
    mockedUseShopping.mockReturnValue({ data: undefined, isLoading: true } as any);
    
    render(<ShoppingList listId={mockListId} />, { wrapper });
    
    expect(screen.getByTestId('skeleton-progress-bar')).toBeInTheDocument();
  });

  // T4/AC9: Shows EmptyState when items.length === 0
  it('displays EmptyState when no items exist', () => {
    mockedUseShopping.mockReturnValue({ data: [], isLoading: false } as any);
    
    render(<ShoppingList listId={mockListId} />, { wrapper });
    
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
  });

  // T4/AC10: Progress bar displays "{bought} z {total}" text + visual bar
  it('displays progress bar with text and visual indicator', () => {
    render(<ShoppingList listId={mockListId} />, { wrapper });
    
    // Text: "1 z 3"
    expect(screen.getByText(/1 z 3/)).toBeInTheDocument();
    
    // Visual bar (progressbar role with aria attributes)
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuemax', '3');
    expect(progressBar).toHaveAttribute('aria-valuenow', '1');
  });

  it('renders category groups', () => {
    render(<ShoppingList listId={mockListId} />, { wrapper });
    
    expect(screen.getByText('Owoce')).toBeInTheDocument();
  });

  it('renders bought section', () => {
    render(<ShoppingList listId={mockListId} />, { wrapper });
    
    expect(screen.getByText(/Kupione/)).toBeInTheDocument();
  });
});
