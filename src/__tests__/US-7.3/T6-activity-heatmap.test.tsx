import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * T6: ActivityHeatmap (CSS Grid)
 * Tests for ActivityHeatmap component
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Component does not exist yet
 */

describe('T6: ActivityHeatmap (CSS Grid)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockData = Array.from({ length: 90 }, (_, i) => {
    const date = new Date('2024-01-20');
    date.setDate(date.getDate() - (89 - i));
    return {
      date: date.toISOString().split('T')[0],
      count: i % 5,
      intensity: i % 5,
    };
  });

  describe('Component Rendering', () => {
    it('AC6.1: Heatmap renders 90-day grid (7 rows × ~13 columns)', async () => {
      const { ActivityHeatmap } = await import('@/components/analytics/ActivityHeatmap');

      const { container } = render(<ActivityHeatmap data={mockData} />);

      // Should have 90 cells
      const cells = container.querySelectorAll('[data-testid^="heatmap-cell-"]');
      expect(cells.length).toBe(90);
    });

    it('AC6.2: Cell colors match intensity: 0=#EBEDF0, 1=#C6E48B, 2=#7BC96F, 3=#239A3B, 4=#196127', async () => {
      const { ActivityHeatmap } = await import('@/components/analytics/ActivityHeatmap');

      const { container } = render(<ActivityHeatmap data={mockData} />);

      const cells = container.querySelectorAll('[data-testid^="heatmap-cell-"]');

      // Check colors for each intensity level
      const intensityColors = {
        0: '#EBEDF0',
        1: '#C6E48B',
        2: '#7BC96F',
        3: '#239A3B',
        4: '#196127',
      };

      for (let intensity = 0; intensity <= 4; intensity++) {
        const cellWithIntensity = Array.from(cells).find(cell => {
          const cellIntensity = parseInt(cell.getAttribute('data-intensity') || '0');
          return cellIntensity === intensity;
        });
        expect(cellWithIntensity).toHaveStyle({ backgroundColor: intensityColors[intensity as keyof typeof intensityColors] });
      }
    });

    it('AC6.3: Cell title attribute shows date + count', async () => {
      const { ActivityHeatmap } = await import('@/components/analytics/ActivityHeatmap');

      const { container } = render(<ActivityHeatmap data={mockData} />);

      const firstCell = container.querySelector('[data-testid^="heatmap-cell-"]');
      expect(firstCell).toHaveAttribute('title');
      const title = firstCell?.getAttribute('title');
      expect(title).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(title).toMatch(/activities:\s*\d+/);
    });

    it('AC6.4: Legend shows color scale (Less → More)', async () => {
      const { ActivityHeatmap } = await import('@/components/analytics/ActivityHeatmap');

      render(<ActivityHeatmap data={mockData} />);

      expect(screen.getByText(/less/i)).toBeInTheDocument();
      expect(screen.getByText(/more/i)).toBeInTheDocument();
    });

    it('AC6.5: Full width on large screens (lg:col-span-2)', async () => {
      const { ActivityHeatmap } = await import('@/components/analytics/ActivityHeatmap');

      const { container } = render(<ActivityHeatmap data={mockData} />);

      const heatmap = container.querySelector('[data-testid="activity-heatmap"]');
      expect(heatmap).toHaveClass('lg:col-span-2');
    });

    it('AC6.6: Empty state when no activity data', async () => {
      const { ActivityHeatmap } = await import('@/components/analytics/ActivityHeatmap');

      render(<ActivityHeatmap data={[]} />);

      expect(screen.getByText(/no activity data/i)).toBeInTheDocument();
    });
  });
});
