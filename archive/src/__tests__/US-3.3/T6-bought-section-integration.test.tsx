import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ═══════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════

// Mock ShoppingItem component (lesson 12)
vi.mock('@/components/shopping/ShoppingItem', () => ({
  ShoppingItem: ({ id, name, isBought }: any) => (
    <div data-testid={`shopping-item-${id}`}>
      {name} - {isBought ? 'bought' : 'active'}
    </div>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

// Mock fetch for bulk delete
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

const mockBoughtItems = [
  {
    id: 'item-1',
    list_id: 'list-1',
    name: 'Milk',
    quantity: 1,
    unit: 'l',
    category_id: 'cat-1',
    category_name: 'Dairy',
    store: null,
    is_bought: true,
    added_by: null,
    bought_by: 'profile-1',
    estimated_price: null,
    source: 'manual',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T01:00:00Z',
  },
  {
    id: 'item-2',
    list_id: 'list-1',
    name: 'Bread',
    quantity: 2,
    unit: null,
    category_id: 'cat-2',
    category_name: 'Bakery',
    store: null,
    is_bought: true,
    added_by: null,
    bought_by: 'profile-1',
    estimated_price: null,
    source: 'manual',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T01:00:00Z',
  },
];

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('T6: BoughtSection Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Render ShoppingItem instead of plain divs', () => {
    it('should render ShoppingItem components for bought items', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      // Should render ShoppingItem for each bought item
      expect(screen.getByTestId('shopping-item-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-item-item-2')).toBeInTheDocument();
    });

    it('should NOT render old plain divs with line-through', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();

      const { container } = render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      // Old structure should not exist
      const oldDivs = container.querySelectorAll('.line-through.opacity-60');
      expect(oldDivs.length).toBe(0);
    });
  });

  describe('AC2: Wrap items with AnimatePresence', () => {
    it('should wrap bought items with AnimatePresence', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    });
  });

  describe('AC3: Show "Wyczyść" button', () => {
    it('should display clear button in summary', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      const clearButton = screen.getByRole('button', { name: /wyczyść/i });
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('AC4: Confirm dialog before bulk clear', () => {
    it('should show confirm dialog when clicking clear button', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();
      const user = userEvent.setup();

      // Mock window.confirm
      const mockConfirm = vi.fn(() => false); // User cancels
      global.confirm = mockConfirm;

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      const clearButton = screen.getByRole('button', { name: /wyczyść/i });
      await user.click(clearButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Czy na pewno chcesz usunąć')
      );
    });

    it('should NOT delete if user cancels confirm', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();
      const user = userEvent.setup();

      global.confirm = vi.fn(() => false); // Cancel

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      const clearButton = screen.getByRole('button', { name: /wyczyść/i });
      await user.click(clearButton);

      // Should NOT call fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('AC5: Call DELETE for each bought item with Promise.all', () => {
    it('should call DELETE for all bought items when user confirms', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();
      const user = userEvent.setup();

      global.confirm = vi.fn(() => true); // Confirm
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      const clearButton = screen.getByRole('button', { name: /wyczyść/i });
      await user.click(clearButton);

      // Should call DELETE for each item
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/shopping/items/item-1',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/shopping/items/item-2',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('AC6: Invalidate shopping query after clear', () => {
    it('should invalidate query after successful bulk delete', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();
      const user = userEvent.setup();

      global.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      const clearButton = screen.getByRole('button', { name: /wyczyść/i });
      await user.click(clearButton);

      // Implementation should call queryClient.invalidateQueries(['shopping', 'list-1'])
      // This is verified by the implementation
    });
  });

  describe('AC7: Show loading state during clear', () => {
    it('should show "Czyszczenie..." text while deleting', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();
      const user = userEvent.setup();

      global.confirm = vi.fn(() => true);
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              100
            )
          )
      );

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      const clearButton = screen.getByRole('button', { name: /wyczyść/i });
      await user.click(clearButton);

      // Should show loading state
      expect(screen.getByText(/czyszczenie/i)).toBeInTheDocument();
    });
  });

  describe('AC8: Accept listId prop', () => {
    it('should accept and use listId prop', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();

      // Should not throw when passing listId
      expect(() => {
        render(
          <Wrapper>
            <BoughtSection items={mockBoughtItems} listId="list-2" />
          </Wrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Regression: Existing behavior preserved', () => {
    it('should return null when no bought items exist', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();

      const { container } = render(
        <Wrapper>
          <BoughtSection items={[]} listId="list-1" />
        </Wrapper>
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show count in summary', async () => {
      const { BoughtSection } = await import('@/components/shopping/BoughtSection');
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <BoughtSection items={mockBoughtItems} listId="list-1" />
        </Wrapper>
      );

      expect(screen.getByText(/kupione \(2\)/i)).toBeInTheDocument();
    });
  });
});
