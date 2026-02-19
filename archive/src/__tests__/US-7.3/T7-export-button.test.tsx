import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

/**
 * T7: ExportButton (CSV)
 * Tests for ExportButton component
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Component does not exist yet
 */

// Mock URL.createObjectURL and revokeObjectURL (preserve URL constructor for jsdom)
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
(global.URL as any).createObjectURL = mockCreateObjectURL;
(global.URL as any).revokeObjectURL = mockRevokeObjectURL;

// Mock document.createElement('a')
const mockAnchorElement = {
  href: '',
  download: '',
  click: vi.fn(),
  remove: vi.fn(),
};

const originalCreateElement = document.createElement.bind(document);
const mockCreateElement = vi.fn((tag: string) => {
  if (tag === 'a') return mockAnchorElement as any;
  return originalCreateElement(tag);
});

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: mockCreateElement,
});

// Mock Blob (must use regular function, not arrow, to support `new`)
const mockBlob = vi.fn(function (this: any, data: any, options: any) {
  this.size = data[0].length;
  this.type = options?.type || 'text/csv';
});

Object.defineProperty(global, 'Blob', {
  writable: true,
  value: mockBlob,
});

// Mock tasks data
const mockTasks = [
  {
    id: 'task-1',
    title: 'Buy groceries',
    board_id: 'board-1',
    column: 'done',
    priority: 'medium',
    due_date: '2024-01-15',
    created_by: 'user-1',
    created_at: '2024-01-10T10:00:00Z',
    completed_at: '2024-01-15T14:30:00Z',
    board: 'Home',
  },
  {
    id: 'task-2',
    title: 'Finish project',
    board_id: 'board-2',
    column: 'in_progress',
    priority: 'high',
    due_date: '2024-01-20',
    created_by: 'user-1',
    created_at: '2024-01-12T10:00:00Z',
    completed_at: null,
    board: 'Work',
  },
];

describe('T7: ExportButton (CSV)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2024-01-20'));
    // Reset anchor element properties between tests
    mockAnchorElement.href = '';
    mockAnchorElement.download = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('AC7.1: Export button renders with download icon', async () => {
      const { ExportButton } = await import('@/components/analytics/ExportButton');

      render(<ExportButton tasks={mockTasks} />);

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });

    it('AC7.2: Click triggers CSV generation from tasks data', async () => {
      const { ExportButton } = await import('@/components/analytics/ExportButton');

      render(<ExportButton tasks={mockTasks} />);

      const button = screen.getByRole('button', { name: /export/i });
      await fireEvent.click(button);

      await waitFor(() => {
        expect(mockBlob).toHaveBeenCalled();
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
    });

    it('AC7.3: CSV has headers: ID, Title, Board, Column, Priority, Due Date, Created, Completed', async () => {
      const { ExportButton } = await import('@/components/analytics/ExportButton');

      render(<ExportButton tasks={mockTasks} />);

      const button = screen.getByRole('button', { name: /export/i });
      await fireEvent.click(button);

      await waitFor(() => {
        const csvData = mockBlob.mock.calls[0][0][0];
        expect(csvData).toContain('ID,Title,Board,Column,Priority,Due Date,Created,Completed');
      });
    });

    it('AC7.4: CSV values properly escaped (quoted)', async () => {
      const { ExportButton } = await import('@/components/analytics/ExportButton');

      const tasksWithQuotes = [
        ...mockTasks,
        {
          id: 'task-3',
          title: 'Task with "quotes" and, comma',
          board_id: 'board-1',
          column: 'idea',
          priority: 'low',
          due_date: '2024-01-25',
          created_by: 'user-1',
          created_at: '2024-01-14T10:00:00Z',
          completed_at: null,
          board: 'Home',
        },
      ];

      render(<ExportButton tasks={tasksWithQuotes} />);

      const button = screen.getByRole('button', { name: /export/i });
      await fireEvent.click(button);

      await waitFor(() => {
        const csvData = mockBlob.mock.calls[0][0][0];
        // Quoted values should be wrapped in quotes
        expect(csvData).toContain('"Task with ""quotes"" and, comma"');
      });
    });

    it('AC7.5: Filename format: `kira-dashboard-export-YYYY-MM-DD.csv`', async () => {
      const { ExportButton } = await import('@/components/analytics/ExportButton');

      render(<ExportButton tasks={mockTasks} />);

      const button = screen.getByRole('button', { name: /export/i });
      await fireEvent.click(button);

      await waitFor(() => {
        expect(mockAnchorElement.download).toBe('kira-dashboard-export-2024-01-20.csv');
      });
    });

    it('AC7.6: Loading state during export', async () => {
      const { ExportButton } = await import('@/components/analytics/ExportButton');

      render(<ExportButton tasks={mockTasks} />);

      const button = screen.getByRole('button', { name: /export/i });

      // Before click, button should not be disabled
      expect(button).not.toBeDisabled();

      await fireEvent.click(button);

      // During export, button should show loading state
      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(screen.getByText(/exporting/i) || screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      // After export completes, button should be enabled again
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      }, { timeout: 3000 });
    });

    it('AC7.7: Toast on success/error', async () => {
      const { ExportButton } = await import('@/components/analytics/ExportButton');

      render(<ExportButton tasks={mockTasks} />);

      const button = screen.getByRole('button', { name: /export/i });
      await fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/export successful/i)).toBeInTheDocument();
      });
    });

    it('AC7.8: Empty data shows error toast', async () => {
      const { ExportButton } = await import('@/components/analytics/ExportButton');

      render(<ExportButton tasks={[]} />);

      const button = screen.getByRole('button', { name: /export/i });
      await fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/no data to export/i)).toBeInTheDocument();
        expect(mockBlob).not.toHaveBeenCalled();
      });
    });
  });
});
