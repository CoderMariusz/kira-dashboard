import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T4: ActivityFilters Component Tests
 * Filter bar with entity type and actor selects, URL search params sync, responsive layout
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * ActivityFilters component does not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

// Mock Radix Select to render options inline (jsdom can't handle portals)
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-root" data-value={value}>
      {React.Children.map(children, (child: any) =>
        child ? React.cloneElement(child, { onValueChange, value }) : null
      )}
    </div>
  ),
  SelectTrigger: ({ children, className, ...props }: any) => (
    <button role="combobox" className={className} {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
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

vi.mock('@/lib/hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({
    data: {
      id: 'hh-1',
      name: 'Rodzina Kowalskich',
      members: [
        { id: 'user-1', display_name: 'Jan Kowalski', avatar_url: null },
        { id: 'user-2', display_name: 'Anna Nowak', avatar_url: null },
      ],
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}));

describe('T4: ActivityFilters Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('AC4.1: Filter bar with entity type and actor selects', () => {
    it('AC4.1: should render entity type select dropdown', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ|entity/i });
      expect(entityTypeSelect).toBeInTheDocument();
    });

    it('AC4.1: entity type select should have options: Wszystko, Zadania, Zakupy, Przypomnienia', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ|entity/i });

      // Open the select
      await userEvent.click(entityTypeSelect);

      // Check for options
      expect(screen.getByText('Wszystko')).toBeInTheDocument();
      expect(screen.getByText('Zadania')).toBeInTheDocument();
      expect(screen.getByText('Zakupy')).toBeInTheDocument();
      expect(screen.getByText('Przypomnienia')).toBeInTheDocument();
    });

    it('AC4.1: should render actor select dropdown', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const actorSelect = screen.getByRole('combobox', { name: /autor|actor/i });
      expect(actorSelect).toBeInTheDocument();
    });

    it('AC4.1: actor select should be populated from household members', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const actorSelect = screen.getByRole('combobox', { name: /autor|actor/i });

      // Open the select
      await userEvent.click(actorSelect);

      // Should show household members
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
      expect(screen.getByText('Anna Nowak')).toBeInTheDocument();
    });

    it('AC4.1: actor select should include "Kira" option', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const actorSelect = screen.getByRole('combobox', { name: /autor|actor/i });

      // Open the select
      await userEvent.click(actorSelect);

      // Should show Kira
      expect(screen.getByText('Kira')).toBeInTheDocument();
    });

    it('AC4.1: should have accessible labels for selects', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });
      const actorSelect = screen.getByRole('combobox', { name: /autor/i });

      expect(entityTypeSelect).toHaveAccessibleName(/typ|entity/i);
      expect(actorSelect).toHaveAccessibleName(/autor|actor/i);
    });

    it('AC4.1: selects should have proper ARIA attributes', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      const { container } = render(<ActivityFilters householdId="hh-1" />);

      const selects = container.querySelectorAll('[role="combobox"]');
      selects.forEach(select => {
        expect(select).toHaveAttribute('aria-haspopup');
        expect(select).toHaveAttribute('aria-expanded');
      });
    });
  });

  describe('AC4.2: URL search params sync', () => {
    it('AC4.2: should update URL when entity type filter changes', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });

      // Select "Zadania"
      await userEvent.selectOptions(entityTypeSelect, 'task');

      // Should update URL with ?type=task
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: expect.any(String),
          query: expect.stringContaining('type=task'),
        })
      );
    });

    it('AC4.2: should update URL when actor filter changes', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const actorSelect = screen.getByRole('combobox', { name: /autor/i });

      // Select "Jan Kowalski"
      await userEvent.selectOptions(actorSelect, 'user-1');

      // Should update URL with ?actor=user-1
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('actor=user-1'),
        })
      );
    });

    it('AC4.2: should combine multiple filters in URL', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });
      const actorSelect = screen.getByRole('combobox', { name: /autor/i });

      // Select both filters
      await userEvent.selectOptions(entityTypeSelect, 'task');
      await userEvent.selectOptions(actorSelect, 'user-1');

      // Should update URL with both params
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringMatching(/type=task.*actor=user-1|actor=user-1.*type=task/),
        })
      );
    });

    it('AC4.2: should read initial filters from URL search params', async () => {
      // Set initial URL params
      mockSearchParams.set('type', 'task');
      mockSearchParams.set('actor', 'user-1');

      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i }) as HTMLSelectElement;
      const actorSelect = screen.getByRole('combobox', { name: /autor/i }) as HTMLSelectElement;

      // Should have initial values from URL
      expect(entityTypeSelect.value).toBe('task');
      expect(actorSelect.value).toBe('user-1');
    });

    it('AC4.2: should clear filter when "Wszystko" is selected', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });

      // First select "Zadania"
      await userEvent.selectOptions(entityTypeSelect, 'task');

      // Then select "Wszystko"
      await userEvent.selectOptions(entityTypeSelect, 'all');

      // Should remove type param from URL
      expect(mockPush).toHaveBeenCalledWith(
        expect.not.objectContaining({
          query: expect.stringContaining('type='),
        })
      );
    });

    it('AC4.2: should use shallow routing (preserve scroll position)', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });

      await userEvent.selectOptions(entityTypeSelect, 'task');

      // Should use shallow routing
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          scroll: false,
        })
      );
    });
  });

  describe('AC4.3: Responsive layout', () => {
    it('AC4.3: should be vertically stacked (flex-col) on mobile', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      const { container } = render(<ActivityFilters householdId="hh-1" />);

      const filterContainer = container.firstChild as HTMLElement;
      expect(filterContainer).toHaveClass('flex-col');
    });

    it('AC4.3: selects should be full-width on mobile', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      const { container } = render(<ActivityFilters householdId="hh-1" />);

      const selects = container.querySelectorAll('[role="combobox"]');
      selects.forEach(select => {
        const element = select as HTMLElement;
        expect(element).toHaveClass('w-full');
      });
    });

    it('AC4.3: should be horizontal (flex-row) on desktop', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      const { container } = render(<ActivityFilters householdId="hh-1" />);

      const filterContainer = container.firstChild as HTMLElement;
      expect(filterContainer).toHaveClass('md:flex-row');
    });

    it('AC4.3: selects should be compact on desktop', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      const { container } = render(<ActivityFilters householdId="hh-1" />);

      // On desktop, selects should not be full-width
      const filterContainer = container.firstChild as HTMLElement;
      const desktopSelects = container.querySelectorAll('.md\\:w-auto, .md\\:w-\\[\\d+px\\]');
      expect(desktopSelects.length).toBeGreaterThan(0);
    });

    it('AC4.3: should have proper spacing between filters on mobile', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      const { container } = render(<ActivityFilters householdId="hh-1" />);

      const filterContainer = container.firstChild as HTMLElement;
      expect(filterContainer).toHaveClass(/gap-|space-/);
    });

    it('AC4.3: should have compact spacing on desktop', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      const { container } = render(<ActivityFilters householdId="hh-1" />);

      const filterContainer = container.firstChild as HTMLElement;
      expect(filterContainer).toHaveClass(/md:gap-/);
    });
  });

  describe('Filter value mapping', () => {
    it('should map "Zadania" to "task" entity type', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });

      await userEvent.selectOptions(entityTypeSelect, 'task');

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('type=task'),
        })
      );
    });

    it('should map "Zakupy" to "shopping" entity type', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });

      await userEvent.selectOptions(entityTypeSelect, 'shopping');

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('type=shopping'),
        })
      );
    });

    it('should map "Przypomnienia" to "reminder" entity type', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });

      await userEvent.selectOptions(entityTypeSelect, 'reminder');

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('type=reminder'),
        })
      );
    });

    it('should map "Tablice" to "board" entity type', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });

      await userEvent.selectOptions(entityTypeSelect, 'board');

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('type=board'),
        })
      );
    });

    it('should map "Wszystko" to empty string (no filter)', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });

      await userEvent.selectOptions(entityTypeSelect, '');

      expect(mockPush).toHaveBeenCalledWith(
        expect.not.objectContaining({
          query: expect.stringContaining('type='),
        })
      );
    });
  });

  describe('Actor filter special cases', () => {
    it('should have "Wszyscy" option to clear actor filter', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const actorSelect = screen.getByRole('combobox', { name: /autor/i });

      await userEvent.click(actorSelect);

      expect(screen.getByText('Wszyscy')).toBeInTheDocument();
    });

    it('should handle Kira as a special actor (null actor_id)', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const actorSelect = screen.getByRole('combobox', { name: /autor/i });

      await userEvent.click(actorSelect);
      await userEvent.click(screen.getByText('Kira'));

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('actor=kira'),
        })
      );
    });

    it('should show member avatars in actor select options', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');

      render(<ActivityFilters householdId="hh-1" />);

      const actorSelect = screen.getByRole('combobox', { name: /autor/i });

      await userEvent.click(actorSelect);

      // Should show avatars for members
      const avatars = screen.getAllByRole('img');
      expect(avatars.length).toBeGreaterThanOrEqual(2); // At least 2 members
    });
  });
});
