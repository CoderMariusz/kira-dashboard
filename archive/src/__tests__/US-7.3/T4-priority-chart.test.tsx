import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * T4: PriorityChart (Pie Chart)
 * Tests for PriorityChart component
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

describe('T4: PriorityChart (Pie Chart)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockData = [
    { name: 'Urgent', value: 5, color: '#EF4444' },
    { name: 'High', value: 8, color: '#F59E0B' },
    { name: 'Medium', value: 12, color: '#3B82F6' },
    { name: 'Low', value: 3, color: '#6B7280' },
  ];

  describe('Component Rendering', () => {
    it('AC4.1: Pie chart renders with correct segments', async () => {
      const { PriorityChart } = await import('@/components/analytics/PriorityChart');

      render(<PriorityChart data={mockData} />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toHaveAttribute('data-count', '4');
    });

    it('AC4.2: Colors match priority: urgent=#EF4444, high=#F59E0B, medium=#3B82F6, low=#6B7280', async () => {
      const { PriorityChart } = await import('@/components/analytics/PriorityChart');

      const { container } = render(<PriorityChart data={mockData} />);

      const cells = container.querySelectorAll('[data-testid="cell"]');
      expect(cells.length).toBe(4);

      // Check colors are applied to cells
      const colors = Array.from(cells).map(cell => cell.getAttribute('fill'));
      expect(colors).toContain('#EF4444');
      expect(colors).toContain('#F59E0B');
      expect(colors).toContain('#3B82F6');
      expect(colors).toContain('#6B7280');
    });

    it('AC4.3: Labels show name + percentage', async () => {
      const { PriorityChart } = await import('@/components/analytics/PriorityChart');

      render(<PriorityChart data={mockData} />);

      // Total is 28, so percentages are:
      // Urgent: 5/28 = 17.9%
      // High: 8/28 = 28.6%
      // Medium: 12/28 = 42.9%
      // Low: 3/28 = 10.7%

      expect(screen.getByText(/Urgent/)).toBeInTheDocument();
      expect(screen.getByText(/High/)).toBeInTheDocument();
      expect(screen.getByText(/Medium/)).toBeInTheDocument();
      expect(screen.getByText(/Low/)).toBeInTheDocument();
    });

    it('AC4.4: Legend visible below chart', async () => {
      const { PriorityChart } = await import('@/components/analytics/PriorityChart');

      render(<PriorityChart data={mockData} />);

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('AC4.5: Tooltip on hover', async () => {
      const { PriorityChart } = await import('@/components/analytics/PriorityChart');

      render(<PriorityChart data={mockData} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('AC4.6: Empty state when no active tasks', async () => {
      const { PriorityChart } = await import('@/components/analytics/PriorityChart');

      render(<PriorityChart data={[]} />);

      expect(screen.getByText(/no active tasks/i)).toBeInTheDocument();
    });
  });
});
