import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T5: Activity Page Tests
 * Page integration with title, filters, feed, household loading/error states, URL filter state
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Activity page implementation does not exist yet
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

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/components/activity/ActivityFilters', () => ({
  ActivityFilters: ({ householdId }: { householdId: string }) => (
    <div data-testid="activity-filters">ActivityFilters for {householdId}</div>
  ),
}));

vi.mock('@/components/activity/ActivityFeed', () => ({
  ActivityFeed: ({ householdId, filters }: { householdId: string; filters?: any }) => (
    <div data-testid="activity-feed">
      ActivityFeed for {householdId}
      {filters && <span data-testid="filters">{JSON.stringify(filters)}</span>}
    </div>
  ),
}));

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

describe('T5: Activity Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('AC5.1: Replace placeholder with full Activity Feed page', () => {
    it('AC5.1: should render page title "📊 Aktywność"', async () => {
      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      expect(screen.getByText('📊 Aktywność')).toBeInTheDocument();
    });

    it('AC5.1: should render ActivityFilters component', async () => {
      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      expect(screen.getByTestId('activity-filters')).toBeInTheDocument();
    });

    it('AC5.1: should render ActivityFeed component below filters', async () => {
      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();

      // Check that feed is below filters
      const filters = screen.getByTestId('activity-filters');
      const feed = screen.getByTestId('activity-feed');
      expect(filters.compareDocumentPosition(feed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('AC5.1: should call useActivityRealtime for live updates', async () => {
      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      expect(useActivityRealtime).toHaveBeenCalled();
    });
  });

  describe('AC5.2: Fetch household ID from useHousehold hook', () => {
    it('AC5.2: should fetch household data on mount', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');
      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      expect(useHousehold).toHaveBeenCalled();
    });

    it('AC5.2: should show loading skeleton while household loads', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      // Mock household loading state
      vi.mocked(useHousehold).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      // Should show loading state
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('AC5.2: should show error if no household', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      // Mock household error state
      vi.mocked(useHousehold).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('No household'),
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      // Should show error message
      expect(screen.getByText(/error|błąd|no household/i, { exact: false })).toBeInTheDocument();
    });

    it('AC5.2: should render filters and feed when household is loaded', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      // Mock household loaded state
      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      // Should render filters and feed
      expect(screen.getByTestId('activity-filters')).toBeInTheDocument();
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
    });

    it('AC5.2: should pass householdId to ActivityFilters', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      const filters = screen.getByTestId('activity-filters');
      expect(filters).toHaveTextContent('hh-1');
    });

    it('AC5.2: should pass householdId to ActivityFeed', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      const feed = screen.getByTestId('activity-feed');
      expect(feed).toHaveTextContent('hh-1');
    });
  });

  describe('AC5.3: Pass filter state from ActivityFilters to ActivityFeed', () => {
    it('AC5.3: should read filter state from URL search params', async () => {
      // Set URL params
      mockSearchParams.set('type', 'task');
      mockSearchParams.set('actor', 'user-1');

      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      // ActivityFeed should receive filters
      const feed = screen.getByTestId('activity-feed');
      const filters = within(feed).getByTestId('filters');
      expect(filters).toHaveTextContent(/task/);
      expect(filters).toHaveTextContent(/user-1/);
    });

    it('AC5.3: should pass entityType filter to ActivityFeed', async () => {
      mockSearchParams.set('type', 'shopping');

      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      const feed = screen.getByTestId('activity-feed');
      const filters = within(feed).getByTestId('filters');
      expect(filters).toHaveTextContent(/shopping/);
    });

    it('AC5.3: should pass actorId filter to ActivityFeed', async () => {
      mockSearchParams.set('actor', 'user-2');

      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      const feed = screen.getByTestId('activity-feed');
      const filters = within(feed).getByTestId('filters');
      expect(filters).toHaveTextContent(/user-2/);
    });

    it('AC5.3: should handle empty filters (no URL params)', async () => {
      // No URL params set
      mockSearchParams = new URLSearchParams();

      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      // Feed should still render but without filters
      const feed = screen.getByTestId('activity-feed');
      expect(feed).toBeInTheDocument();
      const filters = within(feed).queryByTestId('filters');
      expect(filters).toBeNull();
    });

    it('AC5.3: should call useActivityRealtime with householdId', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');
      const { useActivityRealtime } = await import('@/lib/hooks/useActivity');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      render(<Wrapper><ActivityPage /></Wrapper>);

      expect(useActivityRealtime).toHaveBeenCalledWith('hh-1');
    });

    it('AC5.3: should update filters when URL params change', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      const { rerender } = render(<Wrapper><ActivityPage /></Wrapper>);

      // Change URL params
      mockSearchParams.set('type', 'reminder');

      // Rerender should update filters
      rerender(<Wrapper><ActivityPage /></Wrapper>);

      const feed = screen.getByTestId('activity-feed');
      const filters = within(feed).getByTestId('filters');
      expect(filters).toHaveTextContent(/reminder/);
    });
  });

  describe('Page layout and structure', () => {
    it('should have proper page heading hierarchy', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      const { container } = render(<Wrapper><ActivityPage /></Wrapper>);

      // Should have a heading (h1, h2, or card-title)
      const heading = container.querySelector('h1, h2, [data-slot="card-title"]');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toContain('Aktywność');
    });

    it('should have proper spacing between filters and feed', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      const { container } = render(<Wrapper><ActivityPage /></Wrapper>);

      // Should have spacing classes
      const pageContent = container.querySelector('[class*="gap-"], [class*="space-"]');
      expect(pageContent).toBeInTheDocument();
    });

    it('should be responsive', async () => {
      const { useHousehold } = await import('@/lib/hooks/useHousehold');

      vi.mocked(useHousehold).mockReturnValue({
        data: { id: 'hh-1', name: 'Test Household', members: [] },
        isLoading: false,
        error: null,
      } as any);

      const ActivityPage = (await import('@/app/(dashboard)/activity/page')).default;
      const Wrapper = createWrapper();

      const { container } = render(<Wrapper><ActivityPage /></Wrapper>);

      // Should have responsive classes
      const pageContent = container.firstChild as HTMLElement;
      expect(pageContent.className).toMatch(/max-w-|container/);
    });
  });
});
