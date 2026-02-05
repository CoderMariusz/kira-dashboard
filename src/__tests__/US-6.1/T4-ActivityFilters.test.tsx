import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T4: ActivityFilters Component Tests
 * Filter bar with entity type and actor selects, URL search params sync, responsive layout
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
    <button
      role="combobox"
      className={className}
      aria-haspopup="listbox"
      aria-expanded="false"
      {...props}
    >
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

      const entityTypeSelect = screen.getByRole('combobox', { name: /typ/i });
      expect(entityTypeSelect).toBeInTheDocument();
    });

    it('AC4.1: entity type select should have options: Wszystko, Zadania, Zakupy, Przypomnienia', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      // Options are rendered inline by mock — query within the first listbox
      const listboxes = screen.getAllByRole('listbox');
      const entityListbox = listboxes[0];

      const options = within(entityListbox).getAllByRole('option');
      const optionTexts = options.map(o => o.textContent);

      expect(optionTexts).toContain('Wszystko');
      expect(optionTexts).toContain('Zadania');
      expect(optionTexts).toContain('Zakupy');
      expect(optionTexts).toContain('Przypomnienia');
    });

    it('AC4.1: should render actor select dropdown', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const actorSelect = screen.getByRole('combobox', { name: /autor/i });
      expect(actorSelect).toBeInTheDocument();
    });

    it('AC4.1: actor select should be populated from household members', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      const actorListbox = listboxes[1];

      expect(within(actorListbox).getByText('Jan Kowalski')).toBeInTheDocument();
      expect(within(actorListbox).getByText('Anna Nowak')).toBeInTheDocument();
    });

    it('AC4.1: actor select should include "Kira" option', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      const actorListbox = listboxes[1];

      expect(within(actorListbox).getByText('Kira')).toBeInTheDocument();
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

      // Click on "Zadania" option in the entity type listbox
      const listboxes = screen.getAllByRole('listbox');
      const taskOption = within(listboxes[0]).getByText('Zadania');
      await userEvent.click(taskOption);

      // Component calls router.push("?type=task", { scroll: false })
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('type=task'),
        expect.objectContaining({ scroll: false })
      );
    });

    it('AC4.2: should update URL when actor filter changes', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      const memberOption = within(listboxes[1]).getByText('Jan Kowalski');
      await userEvent.click(memberOption);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('actor=user-1'),
        expect.objectContaining({ scroll: false })
      );
    });

    it('AC4.2: should combine multiple filters in URL', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');

      // Select entity type
      await userEvent.click(within(listboxes[0]).getByText('Zadania'));

      // Select actor
      await userEvent.click(within(listboxes[1]).getByText('Jan Kowalski'));

      // Second push should contain actor param
      expect(mockPush).toHaveBeenCalledTimes(2);
      expect(mockPush).toHaveBeenLastCalledWith(
        expect.stringContaining('actor=user-1'),
        expect.objectContaining({ scroll: false })
      );
    });

    it('AC4.2: should read initial filters from URL search params', async () => {
      mockSearchParams = new URLSearchParams('type=task&actor=user-1');

      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      // The select roots should have the current values
      const selectRoots = screen.getAllByTestId('select-root');
      expect(selectRoots[0]).toHaveAttribute('data-value', 'task');
      expect(selectRoots[1]).toHaveAttribute('data-value', 'user-1');
    });

    it('AC4.2: should clear filter when "Wszystko" is selected', async () => {
      // Start with a filter active
      mockSearchParams = new URLSearchParams('type=task');

      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      // Click "Wszystko" in the entity type listbox (value="all")
      const listboxes = screen.getAllByRole('listbox');
      const allOption = within(listboxes[0]).getByText('Wszystko');
      await userEvent.click(allOption);

      // Should remove type param — URL should NOT contain type=
      const pushedUrl = mockPush.mock.calls[0][0] as string;
      expect(pushedUrl).not.toContain('type=');
    });

    it('AC4.2: should use shallow routing (preserve scroll position)', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      await userEvent.click(within(listboxes[0]).getByText('Zadania'));

      // Should pass { scroll: false } as second arg
      expect(mockPush).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ scroll: false })
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
        expect(select).toHaveClass('w-full');
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

      // Component uses md:w-[180px] and md:w-[200px] — both have md:w-[ prefix
      const selects = container.querySelectorAll('[role="combobox"]');
      let hasCompactWidth = false;
      selects.forEach(select => {
        const classes = (select as HTMLElement).className;
        if (classes.includes('md:w-[')) hasCompactWidth = true;
      });
      expect(hasCompactWidth).toBe(true);
    });

    it('AC4.3: should have proper spacing between filters on mobile', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      const { container } = render(<ActivityFilters householdId="hh-1" />);

      const filterContainer = container.firstChild as HTMLElement;
      expect(filterContainer).toHaveClass(/gap-/);
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

      const listboxes = screen.getAllByRole('listbox');
      await userEvent.click(within(listboxes[0]).getByText('Zadania'));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('type=task'),
        expect.anything()
      );
    });

    it('should map "Zakupy" to "shopping" entity type', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      await userEvent.click(within(listboxes[0]).getByText('Zakupy'));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('type=shopping'),
        expect.anything()
      );
    });

    it('should map "Przypomnienia" to "reminder" entity type', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      await userEvent.click(within(listboxes[0]).getByText('Przypomnienia'));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('type=reminder'),
        expect.anything()
      );
    });

    it('should map "Tablice" to "board" entity type', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      await userEvent.click(within(listboxes[0]).getByText('Tablice'));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('type=board'),
        expect.anything()
      );
    });

    it('should map "Wszystko" to clearing the type filter', async () => {
      mockSearchParams = new URLSearchParams('type=task');

      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      await userEvent.click(within(listboxes[0]).getByText('Wszystko'));

      const pushedUrl = mockPush.mock.calls[0][0] as string;
      expect(pushedUrl).not.toContain('type=');
    });
  });

  describe('Actor filter special cases', () => {
    it('should have "Wszyscy" option to clear actor filter', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      const actorListbox = listboxes[1];

      expect(within(actorListbox).getByText('Wszyscy')).toBeInTheDocument();
    });

    it('should handle Kira as a special actor (null actor_id)', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      const listboxes = screen.getAllByRole('listbox');
      await userEvent.click(within(listboxes[1]).getByText('Kira'));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('actor=kira'),
        expect.anything()
      );
    });

    it('should show member avatars in actor select options', async () => {
      const { ActivityFilters } = await import('@/components/activity/ActivityFilters');
      render(<ActivityFilters householdId="hh-1" />);

      // Should show avatars for members
      const avatars = screen.getAllByRole('img');
      expect(avatars.length).toBeGreaterThanOrEqual(2);
    });
  });
});
