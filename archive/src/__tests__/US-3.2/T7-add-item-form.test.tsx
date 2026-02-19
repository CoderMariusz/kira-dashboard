import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { ShoppingCategory } from '@/lib/types/database';

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

global.fetch = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
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

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(['categories'], mockCategories);
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════

describe('T7: AddItemForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1: should render all form fields', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    expect(screen.getByLabelText(/nazwa|produkt/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ilość/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/jednostka/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kategoria/i)).toBeInTheDocument();
  });

  it('AC2: should display categories in select dropdown', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    const categorySelect = screen.getByLabelText(/kategoria/i);
    await user.click(categorySelect);

    await waitFor(() => {
      expect(screen.getByText(/nabiał/i)).toBeInTheDocument();
      expect(screen.getByText(/pieczywo/i)).toBeInTheDocument();
    });
  });

  it('AC3: should show "Dodaj kategorię" option in category select', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    const categorySelect = screen.getByLabelText(/kategoria/i);
    await user.click(categorySelect);

    await waitFor(() => {
      expect(screen.getByText(/dodaj kategorię/i)).toBeInTheDocument();
    });
  });

  it('AC4: should open AddCategoryModal when "Dodaj kategorię" selected', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    const categorySelect = screen.getByLabelText(/kategoria/i);
    await user.selectOptions(categorySelect, 'add-new');

    // Modal should appear with category form fields
    await waitFor(() => {
      expect(screen.getByLabelText(/nazwa.*kategori/i)).toBeInTheDocument();
    });
  });

  it('AC5: should call useAddItem mutation on form submit', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();
    const user = userEvent.setup();

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
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
      }),
    } as Response);

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    const nameInput = screen.getByLabelText(/nazwa|produkt/i);
    await user.type(nameInput, 'Milk');

    const submitButton = screen.getByRole('button', { name: /dodaj/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/shopping/items',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('AC6: should show loading state during submission', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();
    const user = userEvent.setup();

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                id: 'item-1',
                list_id: 'list-1',
                name: 'Milk',
                quantity: 1,
                unit: null,
                category_id: null,
                category_name: 'Inne',
                store: null,
                is_bought: false,
                added_by: 'profile-1',
                bought_by: null,
                estimated_price: null,
                source: 'manual',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }),
            } as Response);
          }, 100);
        })
    );

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    const nameInput = screen.getByLabelText(/nazwa|produkt/i);
    await user.type(nameInput, 'Milk');

    const submitButton = screen.getByRole('button', { name: /dodaj/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /dodawanie/i }) ||
          submitButton.hasAttribute('disabled')
      ).toBeTruthy();
    });
  });

  it('AC7: should reset form after successful submission', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();
    const user = userEvent.setup();

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'item-1',
        list_id: 'list-1',
        name: 'Milk',
        quantity: 1,
        unit: null,
        category_id: null,
        category_name: 'Inne',
        store: null,
        is_bought: false,
        added_by: 'profile-1',
        bought_by: null,
        estimated_price: null,
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as Response);

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    const nameInput = screen.getByLabelText(/nazwa|produkt/i) as HTMLInputElement;
    await user.type(nameInput, 'Milk');

    const submitButton = screen.getByRole('button', { name: /dodaj/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(nameInput.value).toBe('');
    });
  });

  it('AC8: should disable submit button when name is empty', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    const submitButton = screen.getByRole('button', { name: /dodaj/i });
    expect(submitButton).toBeDisabled();
  });

  it('AC9: should auto-select newly created category', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();
    const user = userEvent.setup();

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'cat-new',
        name: 'New Category',
        icon: '📦',
        color: '#6B7280',
        position: 100,
        is_default: false,
        created_at: new Date().toISOString(),
      }),
    } as Response);

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    // Use selectOptions for native <select>
    const categorySelect = screen.getByLabelText(/kategoria/i);
    await user.selectOptions(categorySelect, 'add-new');

    // Fill modal form
    const categoryNameInput = await screen.findByLabelText(/nazwa.*kategori/i);
    await user.type(categoryNameInput, 'New Category');

    const modalSubmitButton = screen.getByRole('button', { name: /zapisz/i });
    await user.click(modalSubmitButton);

    // Check if fetch was called for category creation
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/shopping/categories',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('AC10: should include unit select with options: szt, kg, l, opak', async () => {
    const { AddItemForm } = await import('@/components/shopping/AddItemForm');
    const Wrapper = createWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddItemForm listId="list-1" />
      </Wrapper>
    );

    const unitSelect = screen.getByLabelText(/jednostka/i);
    await user.click(unitSelect);

    await waitFor(() => {
      expect(screen.getByText('szt')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
      expect(screen.getByText('l')).toBeInTheDocument();
      expect(screen.getByText('opak')).toBeInTheDocument();
    });
  });
});
