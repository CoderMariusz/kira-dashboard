import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

global.fetch = vi.fn();

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

describe('T6: AddCategoryModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1: should render modal when isOpen=true', async () => {
    const { AddCategoryModal } = await import('@/components/shopping/AddCategoryModal');
    const Wrapper = createWrapper();

    const mockOnClose = vi.fn();

    render(
      <Wrapper>
        <AddCategoryModal isOpen={true} onClose={mockOnClose} />
      </Wrapper>
    );

    expect(screen.getByLabelText(/nazwa/i)).toBeInTheDocument();
  });

  it('AC2: should return null when isOpen=false', async () => {
    const { AddCategoryModal } = await import('@/components/shopping/AddCategoryModal');
    const Wrapper = createWrapper();

    const mockOnClose = vi.fn();

    const { container } = render(
      <Wrapper>
        <AddCategoryModal isOpen={false} onClose={mockOnClose} />
      </Wrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('AC3: should contain form fields (name, icon, color)', async () => {
    const { AddCategoryModal } = await import('@/components/shopping/AddCategoryModal');
    const Wrapper = createWrapper();

    const mockOnClose = vi.fn();

    render(
      <Wrapper>
        <AddCategoryModal isOpen={true} onClose={mockOnClose} />
      </Wrapper>
    );

    expect(screen.getByLabelText(/nazwa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ikona/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kolor/i)).toBeInTheDocument();
  });

  it('AC4: should call mutation on form submit', async () => {
    const { AddCategoryModal } = await import('@/components/shopping/AddCategoryModal');
    const Wrapper = createWrapper();

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'cat-new',
        name: 'Test Category',
        icon: '🎯',
        color: '#FF5722',
        position: 100,
        is_default: false,
        created_at: new Date().toISOString(),
      }),
    } as Response);

    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddCategoryModal isOpen={true} onClose={mockOnClose} />
      </Wrapper>
    );

    const nameInput = screen.getByLabelText(/nazwa/i);
    await user.type(nameInput, 'Test Category');

    const submitButton = screen.getByRole('button', { name: /zapisz|dodaj/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/shopping/categories',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('AC5: should call onClose when cancel button clicked', async () => {
    const { AddCategoryModal } = await import('@/components/shopping/AddCategoryModal');
    const Wrapper = createWrapper();

    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddCategoryModal isOpen={true} onClose={mockOnClose} />
      </Wrapper>
    );

    const cancelButton = screen.getByRole('button', { name: /anuluj/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('AC6: should show loading state during submission', async () => {
    const { AddCategoryModal } = await import('@/components/shopping/AddCategoryModal');
    const Wrapper = createWrapper();

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                id: 'cat-new',
                name: 'Test Category',
                icon: '📦',
                color: '#6B7280',
                position: 100,
                is_default: false,
                created_at: new Date().toISOString(),
              }),
            } as Response);
          }, 100);
        })
    );

    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddCategoryModal isOpen={true} onClose={mockOnClose} />
      </Wrapper>
    );

    const nameInput = screen.getByLabelText(/nazwa/i);
    await user.type(nameInput, 'Test Category');

    const submitButton = screen.getByRole('button', { name: /zapisz|dodaj/i });
    await user.click(submitButton);

    // Check for loading state (disabled button or loading text)
    expect(
      screen.getByRole('button', { name: /tworzenie|zapisywanie/i }) ||
        submitButton.hasAttribute('disabled')
    ).toBeTruthy();
  });

  it('AC7: should call onSuccess callback with category ID on success', async () => {
    const { AddCategoryModal } = await import('@/components/shopping/AddCategoryModal');
    const Wrapper = createWrapper();

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'cat-new',
        name: 'Test Category',
        icon: '📦',
        color: '#6B7280',
        position: 100,
        is_default: false,
        created_at: new Date().toISOString(),
      }),
    } as Response);

    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AddCategoryModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      </Wrapper>
    );

    const nameInput = screen.getByLabelText(/nazwa/i);
    await user.type(nameInput, 'Test Category');

    const submitButton = screen.getByRole('button', { name: /zapisz|dodaj/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('cat-new');
    });
  });

  it('AC8: should disable submit button when name is empty', async () => {
    const { AddCategoryModal } = await import('@/components/shopping/AddCategoryModal');
    const Wrapper = createWrapper();

    const mockOnClose = vi.fn();

    render(
      <Wrapper>
        <AddCategoryModal isOpen={true} onClose={mockOnClose} />
      </Wrapper>
    );

    const submitButton = screen.getByRole('button', { name: /zapisz|dodaj/i });
    expect(submitButton).toBeDisabled();
  });
});
