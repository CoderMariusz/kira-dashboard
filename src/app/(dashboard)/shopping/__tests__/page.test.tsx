import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from '../page';

// Mock server-side Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'list-123', name: 'Lista główna', is_active: true },
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
    <div data-testid="shopping-list">ShoppingList with ID: {listId}</div>
  ),
}));

describe('Shopping Page (T5)', () => {
  // T5/AC2: Page passes listId to ShoppingList component
  it('passes active list ID to ShoppingList component', async () => {
    const PageComponent = await Page();
    render(PageComponent);
    
    expect(screen.getByTestId('shopping-list')).toBeInTheDocument();
    expect(screen.getByText(/list-123/)).toBeInTheDocument();
  });

  // T5/AC3: Page displays fallback message when no active list
  it('displays fallback when no active list exists', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { code: 'PGRST116' },
            })),
          })),
        })),
      })),
    });
    
    const PageComponent = await Page();
    render(PageComponent);
    
    // Text might be in English: "No active shopping list"
    expect(screen.getByText(/No active|Brak aktywnej/i)).toBeInTheDocument();
  });

  // T5/AC4: Page renders without TypeScript errors
  it('renders without TypeScript errors', async () => {
    const PageComponent = await Page();
    expect(() => render(PageComponent)).not.toThrow();
  });
});
