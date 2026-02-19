import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T2: Label Management Page (/settings/labels)
 * Tests for LabelList, CreateLabelButton, LabelModal, and /settings/labels page
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Components do not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS — COMPLETE Supabase + Radix Select
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

// Mock Radix Select (jsdom can't handle portals)
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-root" data-value={value}>
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { onValueChange, value }) : null
      )}
    </div>
  ),
  SelectTrigger: ({ children, className, ...props }: any) => (
    <button role="combobox" className={className} aria-haspopup="listbox" aria-expanded="false" {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children, onValueChange }: any) => (
    <div role="listbox">
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { onValueChange }) : null
      )}
    </div>
  ),
  SelectItem: ({ children, value, onValueChange }: any) => (
    <div role="option" data-value={value} onClick={() => onValueChange?.(value)}>
      {children}
    </div>
  ),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════

const mockLabels = [
  {
    id: 'label-1',
    household_id: 'hh-1',
    name: 'Bug',
    color: '#EF4444',
    created_at: new Date().toISOString(),
  },
  {
    id: 'label-2',
    household_id: 'hh-1',
    name: 'Feature',
    color: '#10B981',
    created_at: new Date().toISOString(),
  },
];

const mockHousehold = {
  id: 'hh-1',
  name: 'Test Household',
  invite_code: null,
  created_at: new Date().toISOString(),
};

describe('T2: Label Management Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/settings/labels Page (AC2.1)', () => {
    it('AC2.1: should render with heading and create button', async () => {
      // @ts-expect-error - LabelList component doesn't exist yet
      const { default: LabelsPage } = await import('@/app/(dashboard)/settings/labels/page');

      const { createClient } = await import('@/lib/supabase/client');
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockHousehold,
                error: null,
              })),
            })),
            order: vi.fn(() => Promise.resolve({
              data: mockLabels,
              error: null,
            })),
          })),
        })),
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><LabelsPage /></Wrapper>);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Etykiety|Labels/i })).toBeInTheDocument();
      });

      // Create button should be present
      expect(screen.getByRole('button', { name: /Dodaj|Add|Create/i })).toBeInTheDocument();
    });
  });

  describe('LabelList Component (AC2.2, AC2.9)', () => {
    it('AC2.2: should show all household labels with name, color dot, edit/delete buttons', async () => {
      // @ts-expect-error - LabelList component doesn't exist yet
      const { LabelList } = await import('@/components/labels/LabelList');

      const Wrapper = createWrapper();
      render(<Wrapper><LabelList labels={mockLabels} householdId="hh-1" /></Wrapper>);

      // Should show both labels
      expect(screen.getByText('Bug')).toBeInTheDocument();
      expect(screen.getByText('Feature')).toBeInTheDocument();

      // Each label should have edit and delete buttons
      const editButtons = screen.getAllByRole('button', { name: /Edytuj|Edit/i });
      const deleteButtons = screen.getAllByRole('button', { name: /Usuń|Delete/i });
      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });

    it('AC2.9: should show empty state when no labels exist', async () => {
      // @ts-expect-error - LabelList component doesn't exist yet
      const { LabelList } = await import('@/components/labels/LabelList');

      const Wrapper = createWrapper();
      render(<Wrapper><LabelList labels={[]} householdId="hh-1" /></Wrapper>);

      // Should show empty state message
      expect(screen.getByText(/Brak etykiet|No labels/i)).toBeInTheDocument();
    });
  });

  describe('CreateLabelButton Component (AC2.3)', () => {
    it('AC2.3: should open LabelModal when clicked', async () => {
      // @ts-expect-error - CreateLabelButton component doesn't exist yet
      const { CreateLabelButton } = await import('@/components/labels/CreateLabelButton');

      const onOpenModal = vi.fn();

      const Wrapper = createWrapper();
      render(<Wrapper><CreateLabelButton onOpen={onOpenModal} /></Wrapper>);

      const createButton = screen.getByRole('button', { name: /Dodaj|Add|Create/i });
      await userEvent.click(createButton);

      expect(onOpenModal).toHaveBeenCalled();
    });
  });

  describe('LabelModal Component (AC2.4, AC2.5, AC2.6, AC2.8)', () => {
    it('AC2.4: should have name input, color presets (8 colors), custom color input, preview', async () => {
      // @ts-expect-error - LabelModal component doesn't exist yet
      const { LabelModal } = await import('@/components/labels/LabelModal');

      const Wrapper = createWrapper();
      render(<Wrapper><LabelModal open onClose={vi.fn()} onSave={vi.fn()} /></Wrapper>);

      // Name input
      expect(screen.getByLabelText(/Nazwa|Name/i)).toBeInTheDocument();

      // Color presets (8 color options)
      const colorPresets = screen.getAllByRole('radio');
      expect(colorPresets.length).toBeGreaterThanOrEqual(8);

      // Custom color input
      expect(screen.getByLabelText(/Kolor|Color/i, { selector: 'input[type="color"]' })).toBeInTheDocument();

      // Preview should show
      expect(screen.getByText(/Podgląd|Preview/i)).toBeInTheDocument();
    });

    it('AC2.5: should show toast and update list when creating label', async () => {
      // @ts-expect-error - LabelModal component doesn't exist yet
      const { LabelModal } = await import('@/components/labels/LabelModal');
      const { toast } = await import('sonner');

      const onSave = vi.fn().mockResolvedValue({ id: 'new-label' });
      const onClose = vi.fn();

      const Wrapper = createWrapper();
      render(<Wrapper><LabelModal open onClose={onClose} onSave={onSave} /></Wrapper>);

      // Fill name
      const nameInput = screen.getByLabelText(/Nazwa|Name/i);
      await userEvent.type(nameInput, 'New Label');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Zapisz|Save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });

      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringContaining('utworzono|created'),
      }));
    });

    it('AC2.6: should pre-fill form with current values when editing', async () => {
      // @ts-expect-error - LabelModal component doesn't exist yet
      const { LabelModal } = await import('@/components/labels/LabelModal');

      const editingLabel = mockLabels[0];

      const Wrapper = createWrapper();
      render(<Wrapper><LabelModal open onClose={vi.fn()} onSave={vi.fn()} label={editingLabel} /></Wrapper>);

      // Should pre-fill name
      expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();

      // Should show current color as selected
      const colorRadio = screen.getByDisplayValue('#EF4444');
      expect(colorRadio).toBeChecked();
    });

    it('AC2.8: should show error toast for duplicate name', async () => {
      // @ts-expect-error - LabelModal component doesn't exist yet
      const { LabelModal } = await import('@/components/labels/LabelModal');
      const { toast } = await import('sonner');

      const onSave = vi.fn().mockRejectedValue(new Error('Duplicate label name'));
      const onClose = vi.fn();

      const Wrapper = createWrapper();
      render(<Wrapper><LabelModal open onClose={onClose} onSave={onSave} existingLabels={mockLabels} /></Wrapper>);

      // Fill with existing name
      const nameInput = screen.getByLabelText(/Nazwa|Name/i);
      await userEvent.type(nameInput, 'Bug');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Zapisz|Save/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({
          variant: 'error',
          title: expect.stringContaining('istnieje|duplicate|exists'),
        }));
      });
    });
  });

  describe('Delete Label (AC2.7)', () => {
    it('AC2.7: should show confirmation, remove from list after delete', async () => {
      // @ts-expect-error - LabelList component doesn't exist yet
      const { LabelList } = await import('@/components/labels/LabelList');

      const Wrapper = createWrapper();
      const { rerender } = render(<Wrapper><LabelList labels={mockLabels} householdId="hh-1" /></Wrapper>);

      // Click delete button for first label
      const deleteButtons = screen.getAllByRole('button', { name: /Usuń|Delete/i });
      await userEvent.click(deleteButtons[0]);

      // Should show confirmation dialog
      expect(screen.getByText(/Czy na pewno|Are you sure/i)).toBeInTheDocument();

      // Confirm delete
      const confirmButton = screen.getByRole('button', { name: /Usuń|Delete/i });
      await userEvent.click(confirmButton);

      // After delete, should only show one label
      await waitFor(() => {
        const remainingDeleteButtons = screen.queryAllByRole('button', { name: /Usuń|Delete/i });
        expect(remainingDeleteButtons).toHaveLength(1);
      });
    });
  });
});
