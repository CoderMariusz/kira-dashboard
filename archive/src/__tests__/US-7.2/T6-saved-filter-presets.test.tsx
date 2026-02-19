import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T6: Saved Filter Presets
 * Tests for saving, loading, deleting filter presets from localStorage
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Filter preset functionality doesn't exist yet
 */

// ═══════════════════════════════════════════
// MOCKS — COMPLETE Supabase client + localStorage
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

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

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

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
];

const mockAssignees = [
  { id: 'user-1', display_name: 'John' },
  { id: 'user-2', display_name: 'Jane' },
];

const mockFilterState = {
  labels: ['label-1'],
  priorities: ['high'],
  assignees: ['user-1'],
  search: 'bug',
};

const mockSavedPreset = {
  id: 'preset-1',
  name: 'My Bug Tasks',
  filters: mockFilterState,
  createdAt: new Date().toISOString(),
};

describe('T6: Saved Filter Presets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Save Filter Preset (AC6.1, AC6.6)', () => {
    it('AC6.1: should save filter preset with custom name to localStorage', async () => {
      // @ts-expect-error - FilterSidebar doesn't have preset saving yet
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
            assignees={mockAssignees}
          />
        </Wrapper>
      );

      // Type preset name
      const nameInput = screen.getByLabelText(/Nazwa|Name/i, { selector: 'input' });
      await userEvent.type(nameInput, 'My Bug Tasks');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /Zapisz preset|Save preset/i });
      await userEvent.click(saveButton);

      // Check localStorage
      const storedPresets = JSON.parse(localStorage.getItem('filter-presets') ?? '[]');
      expect(storedPresets).toHaveLength(1);
      expect(storedPresets[0].name).toBe('My Bug Tasks');
      expect(storedPresets[0].filters).toEqual(filters);
    });

    it('AC6.6: empty preset name should show error', async () => {
      // @ts-expect-error - FilterSidebar doesn't have preset saving yet
      const { FilterSidebar } = await import('@/components/kanban/FilterSidebar');
      const { toast } = await import('sonner');

      const filters = { labels: [], priorities: [], assignees: [], search: '' };
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
            assignees={mockAssignees}
          />
        </Wrapper>
      );

      // Click save without typing name
      const saveButton = screen.getByRole('button', { name: /Zapisz preset|Save preset/i });
      await userEvent.click(saveButton);

      // Should show error toast
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'error',
        title: expect.stringContaining('Nazwa|Name'),
      }));

      // Should NOT save to localStorage
      const storedPresets = JSON.parse(localStorage.getItem('filter-presets') ?? '[]');
      expect(storedPresets).toHaveLength(0);
    });
  });

  describe('List Saved Presets (AC6.2)', () => {
    it('AC6.2: saved presets should be listed in FilterSidebar', async () => {
      // Pre-populate localStorage with presets
      const presets = [
        { id: 'preset-1', name: 'My Bug Tasks', filters: mockFilterState },
        { id: 'preset-2', name: 'High Priority', filters: { labels: [], priorities: ['high'], assignees: [], search: '' } },
      ];
      localStorage.setItem('filter-presets', JSON.stringify(presets));

      // @ts-expect-error - FilterSidebar doesn't list presets yet
      const { FilterSidebar } = await import('@/components/kanban/FilterSidebar');

      const filters = { labels: [], priorities: [], assignees: [], search: '' };
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
            assignees={mockAssignees}
          />
        </Wrapper>
      );

      // Should show both presets
      expect(screen.getByText('My Bug Tasks')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });
  });

  describe('Load Saved Preset (AC6.3)', () => {
    it('AC6.3: clicking preset should load its filters', async () => {
      // Pre-populate localStorage
      const presets = [
        { id: 'preset-1', name: 'My Bug Tasks', filters: mockFilterState },
      ];
      localStorage.setItem('filter-presets', JSON.stringify(presets));

      // @ts-expect-error - FilterSidebar doesn't load presets yet
      const { FilterSidebar } = await import('@/components/kanban/FilterSidebar');

      const filters = { labels: [], priorities: [], assignees: [], search: '' };
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
            assignees={mockAssignees}
          />
        </Wrapper>
      );

      // Click preset to load
      const presetButton = screen.getByText('My Bug Tasks');
      await userEvent.click(presetButton);

      // Should update filters with preset values
      expect(onFiltersChange).toHaveBeenCalledWith(mockFilterState);
    });
  });

  describe('Delete Preset (AC6.4)', () => {
    it('AC6.4: delete preset should remove from localStorage', async () => {
      // Pre-populate localStorage
      const presets = [
        { id: 'preset-1', name: 'My Bug Tasks', filters: mockFilterState },
        { id: 'preset-2', name: 'High Priority', filters: { labels: [], priorities: ['high'], assignees: [], search: '' } },
      ];
      localStorage.setItem('filter-presets', JSON.stringify(presets));

      // @ts-expect-error - FilterSidebar doesn't delete presets yet
      const { FilterSidebar } = await import('@/components/kanban/FilterSidebar');

      const filters = { labels: [], priorities: [], assignees: [], search: '' };
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
            assignees={mockAssignees}
          />
        </Wrapper>
      );

      // Click delete button on first preset
      const deleteButton = screen.getByRole('button', { name: /Usuń preset My Bug Tasks|Delete preset My Bug Tasks/i });
      await userEvent.click(deleteButton);

      // Confirm delete (exact match to avoid matching "Usuń preset ..." buttons)
      const confirmButton = screen.getByRole('button', { name: /^(Usuń|Delete)$/i });
      await userEvent.click(confirmButton);

      // Should remove from localStorage
      const storedPresets = JSON.parse(localStorage.getItem('filter-presets') ?? '[]');
      expect(storedPresets).toHaveLength(1);
      expect(storedPresets[0].name).toBe('High Priority');
      expect(storedPresets.find((p: any) => p.name === 'My Bug Tasks')).toBeUndefined();
    });
  });

  describe('Persist Across Refresh (AC6.5)', () => {
    it('AC6.5: presets should persist across page refresh', async () => {
      // Save preset
      const presets = [
        { id: 'preset-1', name: 'My Bug Tasks', filters: mockFilterState },
      ];
      localStorage.setItem('filter-presets', JSON.stringify(presets));

      // Simulate page refresh (localStorage persists)
      const storedPresets = JSON.parse(localStorage.getItem('filter-presets') ?? '[]');
      expect(storedPresets).toHaveLength(1);
      expect(storedPresets[0].name).toBe('My Bug Tasks');

      // Render FilterSidebar after "refresh"
      // @ts-expect-error - FilterSidebar doesn't exist yet
      const { FilterSidebar } = await import('@/components/kanban/FilterSidebar');

      const filters = { labels: [], priorities: [], assignees: [], search: '' };
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
            assignees={mockAssignees}
          />
        </Wrapper>
      );

      // Should still show the preset
      expect(screen.getByText('My Bug Tasks')).toBeInTheDocument();
    });
  });
});
