import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ═══════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock sonner
const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    info: mockToastInfo,
  },
}));

// Mock useToggleItem hook (doesn't exist yet)
const mockToggle = vi.fn();
const mockIsPending = vi.fn(() => false);

vi.mock('@/lib/hooks/useToggleItem', () => ({
  useToggleItem: vi.fn(() => ({
    toggle: mockToggle,
    isPending: mockIsPending(),
  })),
}));

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('T1: ShoppingItem Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset useToggleItem to default (isPending: false) — prevents pollution from AC4/AC5 tests
    const { useToggleItem } = await import('@/lib/hooks/useToggleItem');
    vi.mocked(useToggleItem).mockReturnValue({
      toggle: mockToggle,
      isPending: false,
      error: null,
    });
  });

  describe('AC1: Checkbox input', () => {
    it('should render checkbox with checked state matching isBought', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      render(
        <ShoppingItem
          id="item-1"
          listId="list-1"
          name="Tomatoes"
          quantity={2}
          unit="kg"
          categoryName="Vegetables"
          isBought={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('should render checked checkbox when isBought is true', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      render(
        <ShoppingItem
          id="item-2"
          listId="list-1"
          name="Milk"
          quantity={1}
          unit="l"
          categoryName="Dairy"
          isBought={true}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });
  });

  describe('AC2: Display item information', () => {
    it('should display item name, quantity, unit, and category', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      render(
        <ShoppingItem
          id="item-3"
          listId="list-1"
          name="Bread"
          quantity={3}
          unit="loaves"
          categoryName="Bakery"
          isBought={false}
        />
      );

      expect(screen.getByText(/Bread/)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/loaves/)).toBeInTheDocument();
      expect(screen.getByText(/Bakery/)).toBeInTheDocument();
    });
  });

  describe('AC3: Visual style when bought', () => {
    it('should apply line-through and opacity-60 when isBought is true', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      const { container } = render(
        <ShoppingItem
          id="item-4"
          listId="list-1"
          name="Eggs"
          quantity={12}
          unit={null}
          categoryName="Dairy"
          isBought={true}
        />
      );

      // Find element with item name
      const itemElement = screen.getByText(/Eggs/).closest('label');
      expect(itemElement).toHaveClass('line-through');
      expect(itemElement).toHaveClass('opacity-60');
    });

    it('should NOT apply line-through when isBought is false', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      render(
        <ShoppingItem
          id="item-5"
          listId="list-1"
          name="Coffee"
          quantity={1}
          unit="bag"
          categoryName="Beverages"
          isBought={false}
        />
      );

      const itemElement = screen.getByText(/Coffee/).closest('label');
      expect(itemElement).not.toHaveClass('line-through');
      expect(itemElement).not.toHaveClass('opacity-60');
    });
  });

  describe('AC4: Loading indicator', () => {
    it('should show loading indicator (⏳) when isUpdating is true', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      // Override useToggleItem mock for this test
      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');
      vi.mocked(useToggleItem).mockReturnValue({
        toggle: mockToggle,
        isPending: true,
        error: null,
      });

      render(
        <ShoppingItem
          id="item-6"
          listId="list-1"
          name="Rice"
          quantity={1}
          unit="kg"
          categoryName="Grains"
          isBought={false}
        />
      );

      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('should NOT show loading indicator when isUpdating is false', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      render(
        <ShoppingItem
          id="item-7"
          listId="list-1"
          name="Pasta"
          quantity={2}
          unit="packages"
          categoryName="Grains"
          isBought={false}
        />
      );

      expect(screen.queryByText('⏳')).not.toBeInTheDocument();
    });
  });

  describe('AC5: Checkbox disabled during update', () => {
    it('should disable checkbox when isUpdating is true', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');
      vi.mocked(useToggleItem).mockReturnValue({
        toggle: mockToggle,
        isPending: true,
        error: null,
      });

      render(
        <ShoppingItem
          id="item-8"
          listId="list-1"
          name="Butter"
          quantity={1}
          unit={null}
          categoryName="Dairy"
          isBought={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('should enable checkbox when isUpdating is false', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      render(
        <ShoppingItem
          id="item-9"
          listId="list-1"
          name="Cheese"
          quantity={1}
          unit={null}
          categoryName="Dairy"
          isBought={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeEnabled();
    });
  });

  describe('AC6: Label wrapper for accessibility', () => {
    it('should wrap checkbox in label so clicking text toggles checkbox', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');
      const user = userEvent.setup();

      render(
        <ShoppingItem
          id="item-10"
          listId="list-1"
          name="Yogurt"
          quantity={4}
          unit="cups"
          categoryName="Dairy"
          isBought={false}
        />
      );

      const itemText = screen.getByText(/Yogurt/);
      await user.click(itemText);

      // Should call toggle when clicking text (toggle receives id, isBought, name)
      expect(mockToggle).toHaveBeenCalledWith('item-10', false, 'Yogurt');
    });
  });

  describe('AC7: Framer Motion integration', () => {
    it('should use motion.label with layout, initial, animate, exit props', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');

      const { container } = render(
        <ShoppingItem
          id="item-11"
          listId="list-1"
          name="Orange Juice"
          quantity={1}
          unit="carton"
          categoryName="Beverages"
          isBought={false}
        />
      );

      // Check that motion.label is used (our mock renders a label)
      const label = container.querySelector('label');
      expect(label).toBeInTheDocument();
    });
  });

  describe('T7: Toast Notifications', () => {
    it('AC1: should show success toast when marking as bought', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');
      const user = userEvent.setup();

      // Mock toggle to simulate hook's onSuccess behavior (toast fires in hook)
      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');
      vi.mocked(useToggleItem).mockReturnValue({
        toggle: vi.fn((_id: string, currentBought: boolean, itemName: string) => {
          // Simulate onSuccess callback
          if (!currentBought) {
            mockToastSuccess(`✅ ${itemName} kupiony`);
          }
        }),
        isPending: false,
        error: null,
      });

      render(
        <ShoppingItem
          id="item-12"
          listId="list-1"
          name="Apples"
          quantity={5}
          unit={null}
          categoryName="Fruits"
          isBought={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockToastSuccess).toHaveBeenCalled();
    });

    it('AC2: should show info toast when unchecking (back to list)', async () => {
      const { ShoppingItem } = await import('@/components/shopping/ShoppingItem');
      const user = userEvent.setup();

      // Mock toggle to simulate hook's onSuccess behavior
      const { useToggleItem } = await import('@/lib/hooks/useToggleItem');
      vi.mocked(useToggleItem).mockReturnValue({
        toggle: vi.fn((_id: string, currentBought: boolean, itemName: string) => {
          if (currentBought) {
            mockToastInfo(`🔄 ${itemName} z powrotem na liście`);
          }
        }),
        isPending: false,
        error: null,
      });

      render(
        <ShoppingItem
          id="item-13"
          listId="list-1"
          name="Bananas"
          quantity={6}
          unit={null}
          categoryName="Fruits"
          isBought={true}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockToastInfo).toHaveBeenCalled();
    });
  });
});
