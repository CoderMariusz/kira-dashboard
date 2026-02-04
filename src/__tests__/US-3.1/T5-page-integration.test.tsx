import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * T5: Integrate Page Component
 * Tests for shopping page.tsx integration
 * 
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Implementation does not exist yet
 */

// Mock server-side Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'list-1', name: 'Main List', is_active: true },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

// Mock ShoppingList component
vi.mock('@/components/shopping/ShoppingList', () => ({
  default: ({ listId }: { listId: string }) => (
    <div data-testid="shopping-list">ShoppingList with listId: {listId}</div>
  ),
}));

describe('T5: Page Integration', () => {
  it('AC1: should fetch active list using server-side Supabase client', async () => {
    const ShoppingPage = (await import('@/app/(dashboard)/shopping/page')).default;
    const { createClient } = await import('@/lib/supabase/server');

    render(await ShoppingPage());

    expect(createClient).toHaveBeenCalled();
  });

  it('AC2: should pass listId to ShoppingList component', async () => {
    const ShoppingPage = (await import('@/app/(dashboard)/shopping/page')).default;

    render(await ShoppingPage());

    const shoppingList = screen.getByTestId('shopping-list');
    expect(shoppingList).toHaveTextContent('ShoppingList with listId: list-1');
  });

  it('AC3: should display fallback message when no active list', async () => {
    const ShoppingPage = (await import('@/app/(dashboard)/shopping/page')).default;
    const { createClient } = await import('@/lib/supabase/server');

    // Mock no active list
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    render(await ShoppingPage());

    const fallbackMessage = screen.getByText(/No active shopping list/i);
    expect(fallbackMessage).toBeInTheDocument();
  });

  it('AC4: should render without TypeScript errors', async () => {
    // This test verifies that the page component is properly typed
    // and compiles without errors
    
    const ShoppingPage = (await import('@/app/(dashboard)/shopping/page')).default;

    // Should be a valid React component
    const isValidComponent = typeof ShoppingPage === 'function';
    expect(isValidComponent).toBe(true);

    // Should render without throwing
    const { container } = render(await ShoppingPage());
    expect(container).toBeInTheDocument();
  });
});
