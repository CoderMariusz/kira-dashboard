import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T2: Analytics Page & OverviewCards
 * Tests for Analytics page and OverviewCards component
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Components do not exist yet
 */

// Mock Supabase client
const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: [],
          error: null,
        })),
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null,
        })),
      })),
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

// Mock Recharts (required for chart components on the page)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: any) => <div data-testid="line-chart" data-count={data?.length}>{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart" data-count={data?.length}>{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => <div data-testid="pie" data-count={data?.length} />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('T2: Analytics Page & OverviewCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Analytics Page', () => {
    it('AC2.1: /analytics page renders with heading and export button', async () => {
      const AnalyticsPage = await import('@/app/(dashboard)/analytics/page');

      render(<AnalyticsPage.default />);

      expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('AC2.2: page has 2-column grid layout for charts', async () => {
      const AnalyticsPage = await import('@/app/(dashboard)/analytics/page');

      const { container } = render(<AnalyticsPage.default />);

      // Should have a grid with at least 2 columns
      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toBeInTheDocument();
    });

    it('AC2.5: loading state shown while data fetches', async () => {
      const AnalyticsPage = await import('@/app/(dashboard)/analytics/page');

      render(<AnalyticsPage.default />);

      // Should show loading indicator initially
      expect(screen.getByTestId(/loading|skeleton/i) || screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('OverviewCards', () => {
    it('AC2.3: shows 4 stat cards: Completed, Active, Completion Rate (%), Overdue', async () => {
      const { OverviewCards } = await import('@/components/analytics/OverviewCards');

      const mockData = {
        completed: 42,
        active: 15,
        overdue: 3,
        completionRate: 73,
      };

      render(<OverviewCards data={mockData} />);

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();

      expect(screen.getByText(/active/i)).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();

      expect(screen.getByText(/completion rate/i)).toBeInTheDocument();
      expect(screen.getByText(/73%/i)).toBeInTheDocument();

      expect(screen.getByText(/overdue/i)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('AC2.4: each card has label, value, and colored accent bar', async () => {
      const { OverviewCards } = await import('@/components/analytics/OverviewCards');

      const mockData = {
        completed: 42,
        active: 15,
        overdue: 3,
        completionRate: 73,
      };

      const { container } = render(<OverviewCards data={mockData} />);

      // Each card should have an accent bar (colored element)
      const accentBars = container.querySelectorAll('[class*="accent"], [data-accent]');
      expect(accentBars.length).toBeGreaterThanOrEqual(4);
    });

    it('AC2.6: cards handle zero/null data gracefully', async () => {
      const { OverviewCards } = await import('@/components/analytics/OverviewCards');

      const mockData = {
        completed: 0,
        active: 0,
        overdue: 0,
        completionRate: 0,
      };

      render(<OverviewCards data={mockData} />);

      // Should render without crashing and show zeros
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('AC2.6b: cards handle null data', async () => {
      const { OverviewCards } = await import('@/components/analytics/OverviewCards');

      render(<OverviewCards data={null} />);

      // Should render empty state or show dashes
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });
});
