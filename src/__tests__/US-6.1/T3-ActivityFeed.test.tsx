import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T3: ActivityFeed Component Tests
 * List of ActivityItem components with loading, empty, error states and "Load More" button
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * ActivityFeed component does not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS - COMPLETE with all required methods
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            lt: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
            lt: vi.fn(() => Promise.resolve({ data: [], error: null })),
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

vi.mock('@/lib/hooks/useActivity', () => ({
  useActivity: vi.fn(() => ({
    activities: [],
    isLoading: false,
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
  useActivityRealtime: vi.fn(),
}));

vi.mock('@/lib/hooks/useRealtime', () => ({
  useRealtime: vi.fn(),
}));

vi.mock('@/lib/hooks/useHousehold', () => ({
  useHousehold: vi.fn(() => ({
    data: {
      id: 'hh-1',
      name: 'Rodzina Kowalskich',
      members: [],
    },
    isLoading: false,
    error: null,
  })),
}));

// ═══════════════════════════════════════════
// MOCK DATA - ALL fields from ActivityLog type
// ═══════════════════════════════════════════

const mockActivities = [
  {
    id: 'act-1',
    household_id: 'hh-1',
    entity_type: 'task' as const,
    entity_id: 'task-1',
    action: 'created',
    actor_id: 'user-1',
    actor_name: 'Jan Kowalski',
    metadata: { title: 'Zrobić zakupy', board_name: 'DOM' },
    created_at: new Date('2024-01-15T10:30:00Z').toISOString(),
  },
  {
    id: 'act-2',
    household_id: 'hh-1',
    entity_type: 'shopping' as const,
    entity_id: 'list-1',
    action: 'created',
    actor_id: 'user-2',
    actor_name: 'Anna Nowak',
    metadata: { count: 3 },
    created_at: new Date('2024-01-15T09:15:00Z').toISOString(),
  },
];

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

describe('T3: ActivityFeed Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC3.1: Render list with loading, empty, error states', () => {
    it('AC3.1: should render loading skeleton while fetching', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      // Mock useActivity to return loading state
      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: true,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should show skeleton elements
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('AC3.1: should render empty state when no activities', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      // Mock useActivity to return empty data
      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should show empty state message
      expect(screen.getByText(/Brak aktywności/i)).toBeInTheDocument();
    });

    it('AC3.1: should render error state with retry button', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      // Mock useActivity to return error state
      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: false,
        error: new Error('Failed to fetch'),
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should show error message
      expect(screen.getByText(/error|błąd/i, { exact: false })).toBeInTheDocument();

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /ponów|retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('AC3.1: should render list of ActivityItem components', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      // Mock useActivity to return activities
      vi.mocked(useActivity).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should render both activities
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
      expect(screen.getByText('Anna Nowak')).toBeInTheDocument();
    });

    it('AC3.1: should hide loading skeleton when data loads', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      const { container } = render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should not show skeletons when data is loaded
      const skeletons = container.querySelectorAll('[data-testid*="skeleton"]');
      expect(skeletons.length).toBe(0);
    });
  });

  describe('AC3.2: "Load More" button with pagination', () => {
    it('AC3.2: should show "Load More" button when hasNextPage is true', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      const loadMoreButton = screen.getByRole('button', { name: /Załaduj więcej/i });
      expect(loadMoreButton).toBeInTheDocument();
    });

    it('AC3.2: should NOT show "Load More" button when hasNextPage is false', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      const loadMoreButton = screen.queryByRole('button', { name: /Załaduj więcej/i });
      expect(loadMoreButton).not.toBeInTheDocument();
    });

    it('AC3.2: should show spinner while loading next page', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: true,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should show loading spinner
      const spinner = screen.getByRole('status', { hidden: true }) ||
                    screen.getByTestId(/spinner|loading/i);
      expect(spinner).toBeInTheDocument();
    });

    it('AC3.2: should disable button while fetching', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: true,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      const loadMoreButton = screen.getByRole('button', { name: /Załaduj więcej/i });
      expect(loadMoreButton).toBeDisabled();
    });

    it('AC3.2: should call fetchNextPage when button clicked', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      const user = userEvent.setup();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      const loadMoreButton = screen.getByRole('button', { name: /Załaduj więcej/i });
      await user.click(loadMoreButton);

      expect(fetchNextPage).toHaveBeenCalled();
    });

    it('AC3.2: button text should be "Załaduj więcej"', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: mockActivities,
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      const loadMoreButton = screen.getByRole('button', { name: /Załaduj więcej/i });
      expect(loadMoreButton).toHaveTextContent('Załaduj więcej');
    });
  });

  describe('AC3.3: Loading skeleton (5 items)', () => {
    it('AC3.3: should show 5 skeleton items while loading', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: true,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should show exactly 5 skeleton items
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBe(5);
    });

    it('AC3.3: skeleton items should have animated pulse', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: true,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      const { container } = render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Skeleton items should have animate-pulse class
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(5);
    });

    it('AC3.3: skeleton items should have avatar circle', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: true,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      const { container } = render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should have avatar circles (rounded-full)
      const avatarCircles = container.querySelectorAll('.rounded-full');
      expect(avatarCircles.length).toBe(5);
    });

    it('AC3.3: skeleton items should have 2 lines of text', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: true,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      const { container } = render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Each skeleton should have 2 text lines (h-4 or similar)
      const textLines = container.querySelectorAll('.h-4');
      expect(textLines.length).toBeGreaterThanOrEqual(10); // 5 items × 2 lines
    });

    it('AC3.3: skeleton items should have timestamp', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: true,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      const { container } = render(<Wrapper><ActivityFeed householdId="hh-1" /></Wrapper>);

      // Should have timestamp placeholders
      const timestamps = container.querySelectorAll('.h-3'); // Smaller height for timestamps
      expect(timestamps.length).toBe(5);
    });
  });

  describe('Filter support', () => {
    it('should pass filters to useActivity hook', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const filters = { entityType: 'task' as const };
      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" filters={filters} /></Wrapper>);

      expect(useActivity).toHaveBeenCalledWith('hh-1', filters);
    });

    it('should update query when filters change', async () => {
      const { useActivity } = await import('@/lib/hooks/useActivity');
      const { ActivityFeed } = await import('@/components/activity/ActivityFeed');

      const filters = { entityType: 'shopping' as const };
      const fetchNextPage = vi.fn();
      vi.mocked(useActivity).mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
        fetchNextPage,
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const Wrapper = createWrapper();
      render(<Wrapper><ActivityFeed householdId="hh-1" filters={filters} /></Wrapper>);

      expect(useActivity).toHaveBeenCalledWith('hh-1', filters);
    });
  });
});
