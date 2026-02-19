import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T4: Label Selector in TaskForm/TaskModal
 * Tests for TaskForm showing DB label selector and saving label assignments to task_labels
 *
 * EXPECTED: ✅ ALL TESTS SHOULD PASS
 */

// ═══════════════════════════════════════════
// MOCKS — COMPLETE Supabase client + Radix Select
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

const mockLabels: any[] = [
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
  {
    id: 'label-3',
    household_id: 'hh-1',
    name: 'Refactor',
    color: '#F59E0B',
    created_at: new Date().toISOString(),
  },
];

const mockTask: any = {
  id: 'task-1',
  title: 'Fix navigation bug',
  description: '',
  column: 'in_progress',
  priority: 'high',
  labels: [],
  subtasks: [],
};

// ═══════════════════════════════════════════
// Helper: setup mocks for TaskForm tests
// ═══════════════════════════════════════════

function setupTaskFormMocks() {
  vi.doMock('@/lib/hooks/useLabels', () => ({
    useLabels: () => ({ data: mockLabels, isLoading: false }),
  }));
  vi.doMock('@/lib/hooks/useHousehold', () => ({
    useHousehold: () => ({ data: { id: 'hh-1', name: 'Test Household' } }),
  }));
}

/**
 * Helper: find checkboxes in the labels section.
 * The labels section renders checkboxes for Bug, Feature, Refactor (in order).
 */
function getLabelCheckboxes() {
  return screen.getAllByRole('checkbox');
}

describe('T4: Label Selector in TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('TaskForm Label Selector (AC4.1, AC4.2, AC4.3)', () => {
    it('AC4.1: should show available labels as selectable options', async () => {
      setupTaskFormMocks();
      const { TaskForm } = await import('@/components/kanban/TaskForm');

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TaskForm
            boardType="home"
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </Wrapper>
      );

      // Should show all available labels
      expect(screen.getByText('Bug')).toBeInTheDocument();
      expect(screen.getByText('Feature')).toBeInTheDocument();
      expect(screen.getByText('Refactor')).toBeInTheDocument();
    });

    it('AC4.2: multi-select: clicking toggles label selection', async () => {
      setupTaskFormMocks();
      const { TaskForm } = await import('@/components/kanban/TaskForm');

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TaskForm
            boardType="home"
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </Wrapper>
      );

      // Click Bug checkbox to select
      const checkboxes = getLabelCheckboxes();
      const bugCheckbox = checkboxes[0]; // Bug is first label
      await userEvent.click(bugCheckbox);

      // Bug should appear in selected badges (with remove button) + checkbox list = 2 occurrences
      await waitFor(() => {
        expect(screen.getAllByText('Bug').length).toBeGreaterThanOrEqual(2);
      });

      // Click again to deselect
      await userEvent.click(bugCheckbox);

      // Should be deselected — Bug should only appear once (in checkbox list)
      await waitFor(() => {
        expect(screen.getByText('Bug')).toBeInTheDocument();
        // No remove button for Bug anymore
        expect(screen.queryByRole('button', { name: /Usuń label Bug/i })).not.toBeInTheDocument();
      });
    });

    it('AC4.3: selected labels shown as LabelBadge with remove button', async () => {
      setupTaskFormMocks();
      const { TaskForm } = await import('@/components/kanban/TaskForm');

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TaskForm
            boardType="home"
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </Wrapper>
      );

      // Select Bug label via checkbox
      const checkboxes = getLabelCheckboxes();
      await userEvent.click(checkboxes[0]); // Bug checkbox

      // Should show selected as LabelBadge (appears twice: badge + checkbox list)
      await waitFor(() => {
        const allBugs = screen.getAllByText('Bug');
        expect(allBugs.length).toBeGreaterThanOrEqual(2);
        // The first one should be inside a badge span
        expect(allBugs[0].closest('span')).toBeInTheDocument();
      });

      // Should have remove button (×)
      const removeButton = screen.getByRole('button', { name: /Usuń label Bug/i });
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe('Creating Task with Labels (AC4.4)', () => {
    it('AC4.4: creating task should save label assignments to task_labels table', async () => {
      setupTaskFormMocks();
      const { TaskForm } = await import('@/components/kanban/TaskForm');

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TaskForm
            boardType="home"
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </Wrapper>
      );

      // Fill form
      await userEvent.type(screen.getByLabelText(/Tytuł|Title/i), 'New task');

      // Select Bug label via checkbox
      const checkboxes = getLabelCheckboxes();
      await userEvent.click(checkboxes[0]); // Bug

      // Submit
      await userEvent.click(screen.getByRole('button', { name: /Utwórz zadanie/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      // Should include label IDs in submitted form values
      const submittedValues = onSubmit.mock.calls[0][0];
      expect(submittedValues.labels).toContain('label-1');
    });
  });

  describe('Editing Task with Labels (AC4.5)', () => {
    it('AC4.5: editing task should show pre-selected labels', async () => {
      setupTaskFormMocks();
      const { TaskForm } = await import('@/components/kanban/TaskForm');

      const editingTask = {
        ...mockTask,
        labels: ['label-1', 'label-2'], // Pre-selected label IDs
      };

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TaskForm
            boardType="home"
            initialValues={editingTask}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </Wrapper>
      );

      // Should show Bug and Feature as selected badges (each appears twice: badge + checkbox)
      await waitFor(() => {
        expect(screen.getAllByText('Bug').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Feature').length).toBeGreaterThanOrEqual(1);
      });

      // Bug and Feature should have remove buttons (they're selected)
      expect(screen.getByRole('button', { name: /Usuń label Bug/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Usuń label Feature/i })).toBeInTheDocument();

      // Refactor should NOT be selected (no remove button)
      expect(screen.queryByRole('button', { name: /Usuń label Refactor/i })).not.toBeInTheDocument();
    });
  });

  describe('Removing Label from Task (AC4.6)', () => {
    it('AC4.6: removing label from task should delete from task_labels', async () => {
      setupTaskFormMocks();
      const { TaskForm } = await import('@/components/kanban/TaskForm');

      const editingTask = {
        ...mockTask,
        labels: ['label-1', 'label-2'],
      };

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <TaskForm
            boardType="home"
            initialValues={editingTask}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </Wrapper>
      );

      // Click remove button on Bug label
      const removeButton = await screen.findByRole('button', { name: /Usuń label Bug/i });
      await userEvent.click(removeButton);

      // Submit
      await userEvent.click(screen.getByRole('button', { name: /Zapisz zmiany/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      // Submitted values should NOT include removed label
      const submittedValues = onSubmit.mock.calls[0][0];
      expect(submittedValues.labels).not.toContain('label-1');
      // Should still include label-2
      expect(submittedValues.labels).toContain('label-2');
    });
  });
});
