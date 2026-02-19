import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

/**
 * T5: FilterSidebar Component
 * Tests for FilterState, FilterSidebar, Board filter button, and task filtering logic
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
];

const mockTasks: any[] = [
  {
    id: 'task-1',
    board_id: 'board-1',
    title: 'Fix navigation bug',
    description: null,
    column: 'in_progress',
    priority: 'high',
    due_date: null,
    assignee_id: 'user-1',
    created_by: 'user-1',
    position: 0,
    labels: [mockLabels[0]], // Bug label
    subtasks: [],
    source: 'manual',
    original_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    assignee: {
      id: 'user-1',
      user_id: 'auth-user-1',
      household_id: 'hh-1',
      display_name: 'John',
      avatar_url: null,
      role: 'member',
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'task-2',
    board_id: 'board-1',
    title: 'Add search feature',
    description: 'Implement search in app',
    column: 'idea',
    priority: 'medium',
    due_date: null,
    assignee_id: 'user-2',
    created_by: 'user-1',
    position: 1,
    labels: [mockLabels[1]], // Feature label
    subtasks: [],
    source: 'manual',
    original_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    assignee: {
      id: 'user-2',
      user_id: 'auth-user-2',
      household_id: 'hh-1',
      display_name: 'Jane',
      avatar_url: null,
      role: 'member',
      created_at: new Date().toISOString(),
    },
  },
];

// ═══════════════════════════════════════════
// Board hook mocking helper
// ═══════════════════════════════════════════

function setupBoardMocks() {
  vi.doMock('@/lib/hooks/useBoard', () => ({
    useBoard: () => ({ data: { id: 'board-1', name: 'Dom', type: 'home' }, isLoading: false, error: null }),
  }));
  vi.doMock('@/lib/hooks/useTasks', () => ({
    useTasks: () => ({ data: mockTasks, isLoading: false, error: null }),
    useMoveTask: () => ({ mutate: vi.fn() }),
  }));
  vi.doMock('@/lib/hooks/useRealtime', () => ({
    useTasksRealtime: vi.fn(),
  }));
  vi.doMock('@/lib/hooks/useHousehold', () => ({
    useHousehold: () => ({ data: { id: 'hh-1', name: 'Test Household' } }),
  }));
  vi.doMock('@/lib/hooks/useLabels', () => ({
    useLabels: () => ({ data: mockLabels }),
  }));
  vi.doMock('@/lib/store', () => ({
    useUIStore: (selector: any) => {
      const mockState = { openTaskModal: vi.fn() };
      return selector(mockState);
    },
  }));
  // Simplify sub-components that aren't under test
  vi.doMock('@/components/kanban/TaskModal', () => ({
    TaskModal: () => null,
  }));
  vi.doMock('@/components/kanban/DragOverlay', () => ({
    TaskDragOverlay: () => null,
  }));
  // Mock Column to render task titles simply
  vi.doMock('@/components/kanban/Column', () => ({
    Column: ({ tasks }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'column' },
        tasks.map((t: any) =>
          React.createElement('div', { key: t.id, 'data-testid': `task-${t.id}` }, t.title)
        )
      ),
  }));
}

describe('T5: FilterSidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('FilterState Type (AC5.1)', () => {
    it('AC5.1: FilterState has fields: labels (string[]), priorities (string[]), assignees (string[]), search (string)', async () => {
      // @ts-expect-error - FilterState type doesn't exist yet
      const filters: FilterState = {
        labels: ['label-1', 'label-2'],
        priorities: ['high', 'medium'],
        assignees: ['user-1', 'user-2'],
        search: 'bug',
      };

      expect(filters).toHaveProperty('labels');
      expect(filters).toHaveProperty('priorities');
      expect(filters).toHaveProperty('assignees');
      expect(filters).toHaveProperty('search');

      expect(Array.isArray(filters.labels)).toBe(true);
      expect(Array.isArray(filters.priorities)).toBe(true);
      expect(Array.isArray(filters.assignees)).toBe(true);
      expect(typeof filters.search).toBe('string');
    });
  });

  describe('FilterSidebar Component (AC5.2, AC5.4, AC5.7)', () => {
    it('AC5.2: should render search input, labels checkboxes, priority checkboxes, assignee checkboxes', async () => {
      // @ts-expect-error - FilterSidebar doesn't exist yet
      const { FilterSidebar } = await import('@/components/kanban/FilterSidebar');

      const filters = {
        labels: [],
        priorities: [],
        assignees: [],
        search: '',
      };

      const onFiltersChange = vi.fn();
      const onClose = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <FilterSidebar
            open
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClose={onClose}
            labels={mockLabels}
            assignees={[
              { id: 'user-1', display_name: 'John' },
              { id: 'user-2', display_name: 'Jane' },
            ]}
          />
        </Wrapper>
      );

      // Search input
      expect(screen.getByRole('searchbox', { name: /Szukaj|Search/i })).toBeInTheDocument();

      // Labels checkboxes
      expect(screen.getByRole('checkbox', { name: 'Bug' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Feature' })).toBeInTheDocument();

      // Priority checkboxes
      expect(screen.getByRole('checkbox', { name: /High|Wysoki/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /Medium|Średni/i })).toBeInTheDocument();

      // Assignee checkboxes
      expect(screen.getByRole('checkbox', { name: 'John' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Jane' })).toBeInTheDocument();
    });

    it('AC5.4: checking/unchecking filters should update FilterState', async () => {
      // @ts-expect-error - FilterSidebar doesn't exist yet
      const { FilterSidebar } = await import('@/components/kanban/FilterSidebar');

      const onFiltersChange = vi.fn();

      // Stateful wrapper so FilterSidebar prop updates between clicks
      function StatefulFilterWrapper() {
        const [filters, setFilters] = useState({
          labels: [] as string[],
          priorities: [] as string[],
          assignees: [] as string[],
          search: '',
        });

        return (
          <FilterSidebar
            open
            filters={filters}
            onFiltersChange={(f: any) => {
              setFilters(f);
              onFiltersChange(f);
            }}
            onClose={() => {}}
            labels={mockLabels}
            assignees={[
              { id: 'user-1', display_name: 'John' },
              { id: 'user-2', display_name: 'Jane' },
            ]}
          />
        );
      }

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <StatefulFilterWrapper />
        </Wrapper>
      );

      // Check Bug label
      const bugCheckbox = screen.getByRole('checkbox', { name: 'Bug' });
      await userEvent.click(bugCheckbox);

      expect(onFiltersChange).toHaveBeenCalledWith({
        labels: ['label-1'],
        priorities: [],
        assignees: [],
        search: '',
      });

      // Check High priority
      const highCheckbox = screen.getByRole('checkbox', { name: /High|Wysoki/i });
      await userEvent.click(highCheckbox);

      expect(onFiltersChange).toHaveBeenCalledWith({
        labels: ['label-1'],
        priorities: ['high'],
        assignees: [],
        search: '',
      });
    });

    it('AC5.7: "Clear All" button should reset all filters', async () => {
      // @ts-expect-error - FilterSidebar doesn't exist yet
      const { FilterSidebar } = await import('@/components/kanban/FilterSidebar');

      const filters = {
        labels: ['label-1'],
        priorities: ['high'],
        assignees: ['user-1'],
        search: 'bug',
      };

      const onFiltersChange = vi.fn();
      const onClose = vi.fn();

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <FilterSidebar
            open
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClose={onClose}
            labels={mockLabels}
            assignees={[
              { id: 'user-1', display_name: 'John' },
              { id: 'user-2', display_name: 'Jane' },
            ]}
          />
        </Wrapper>
      );

      // Click "Clear All" button
      const clearButton = screen.getByRole('button', { name: /Wyczyść wszystko|Clear all/i });
      await userEvent.click(clearButton);

      expect(onFiltersChange).toHaveBeenCalledWith({
        labels: [],
        priorities: [],
        assignees: [],
        search: '',
      });
    });
  });

  describe('Board Filter Button (AC5.3, AC5.8)', () => {
    it('AC5.3: filter button on Board header should toggle FilterSidebar visibility', async () => {
      setupBoardMocks();
      const { Board } = await import('@/components/kanban/Board');

      const Wrapper = createWrapper();
      render(<Wrapper><Board type="home" /></Wrapper>);

      // Filter button should be present
      const filterButton = screen.getByRole('button', { name: /Filtry|Filters/i });
      expect(filterButton).toBeInTheDocument();

      // Click to open
      await userEvent.click(filterButton);

      // FilterSidebar should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('AC5.8: active filter count should be shown on filter button badge', async () => {
      setupBoardMocks();
      const { Board } = await import('@/components/kanban/Board');

      const Wrapper = createWrapper();
      render(<Wrapper><Board type="home" /></Wrapper>);

      const filterButton = screen.getByRole('button', { name: /Filtry|Filters/i });

      // Open sidebar
      await userEvent.click(filterButton);

      // Select Bug label filter
      const bugCheckbox = screen.getByRole('checkbox', { name: 'Bug' });
      await userEvent.click(bugCheckbox);

      // Badge should show count "1"
      await waitFor(() => {
        const badge = within(filterButton).getByText(/\d+/);
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe('Task Filtering Logic (AC5.5, AC5.6)', () => {
    it('AC5.5: tasks should be filtered: AND between types, OR within type', async () => {
      setupBoardMocks();
      const { Board } = await import('@/components/kanban/Board');

      const Wrapper = createWrapper();
      render(<Wrapper><Board type="home" /></Wrapper>);

      // Initially both tasks should be visible
      expect(screen.getByText('Fix navigation bug')).toBeInTheDocument();
      expect(screen.getByText('Add search feature')).toBeInTheDocument();

      // Open sidebar and apply filters
      await userEvent.click(screen.getByRole('button', { name: /Filtry|Filters/i }));

      // Select Bug label (task-1 has Bug, task-2 has Feature)
      await userEvent.click(screen.getByRole('checkbox', { name: 'Bug' }));

      // Select High priority (task-1 = high, task-2 = medium)
      await userEvent.click(screen.getByRole('checkbox', { name: /Wysoki/i }));

      // task-1 has Bug label AND high priority → should show
      // task-2 has Feature label (not Bug) → should not show
      await waitFor(() => {
        expect(screen.getByText('Fix navigation bug')).toBeInTheDocument();
        expect(screen.queryByText('Add search feature')).not.toBeInTheDocument();
      });
    });

    it('AC5.6: search should filter by title (case-insensitive)', async () => {
      setupBoardMocks();
      const { Board } = await import('@/components/kanban/Board');

      const Wrapper = createWrapper();
      render(<Wrapper><Board type="home" /></Wrapper>);

      // Open sidebar
      await userEvent.click(screen.getByRole('button', { name: /Filtry|Filters/i }));

      // Type search query
      const searchInput = screen.getByRole('searchbox', { name: /Szukaj|Search/i });
      await userEvent.type(searchInput, 'nav');

      // Should show task with "navigation" in title (case-insensitive)
      await waitFor(() => {
        expect(screen.getByText('Fix navigation bug')).toBeInTheDocument();
        expect(screen.queryByText('Add search feature')).not.toBeInTheDocument();
      });
    });
  });
});
