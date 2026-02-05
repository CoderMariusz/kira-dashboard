import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * T5: ShoppingChart (Bar Chart)
 * Tests for ShoppingChart component
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Component does not exist yet
 */

// Mock Recharts completely - jsdom cannot render SVG charts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: any) => <div data-testid="line-chart" data-count={data?.length}>{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart" data-count={data?.length}>{children}</div>,
  Bar: (props: any) => <div data-testid="bar" style={props.style} />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => <div data-testid="pie" data-count={data?.length} />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('T5: ShoppingChart (Bar Chart)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockData = [
    { category: 'Vegetables', count: 12 },
    { category: 'Dairy', count: 8 },
    { category: 'Bakery', count: 5 },
    { category: 'Meat', count: 3 },
    { category: 'Beverages', count: 2 },
  ];

  describe('Component Rendering', () => {
    it('AC5.1: Bar chart renders with Recharts', async () => {
      const { ShoppingChart } = await import('@/components/analytics/ShoppingChart');

      render(<ShoppingChart data={mockData} />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('AC5.2: X-axis shows category names (angled -45°)', async () => {
      const { ShoppingChart } = await import('@/components/analytics/ShoppingChart');

      render(<ShoppingChart data={mockData} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    });

    it('AC5.3: Y-axis shows count', async () => {
      const { ShoppingChart } = await import('@/components/analytics/ShoppingChart');

      render(<ShoppingChart data={mockData} />);

      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('AC5.4: Bars are green (#10B981)', async () => {
      const { ShoppingChart } = await import('@/components/analytics/ShoppingChart');

      const { container } = render(<ShoppingChart data={mockData} />);

      expect(screen.getByTestId('bar')).toBeInTheDocument();
      // Should have fill color #10B981
      const bar = container.querySelector('[data-testid="bar"]');
      expect(bar).toHaveStyle({ fill: '#10B981' });
    });

    it('AC5.5: Top 10 categories only (sorted by count desc)', async () => {
      const { ShoppingChart } = await import('@/components/analytics/ShoppingChart');

      const largeData = Array.from({ length: 15 }, (_, i) => ({
        category: `Category ${i + 1}`,
        count: 15 - i,
      }));

      render(<ShoppingChart data={largeData} />);

      // Should only show top 10
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-count', '10');
    });

    it('AC5.6: Tooltip on hover', async () => {
      const { ShoppingChart } = await import('@/components/analytics/ShoppingChart');

      render(<ShoppingChart data={mockData} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('AC5.7: Empty state when no shopping items', async () => {
      const { ShoppingChart } = await import('@/components/analytics/ShoppingChart');

      render(<ShoppingChart data={[]} />);

      expect(screen.getByText(/no shopping items/i)).toBeInTheDocument();
    });
  });
});
