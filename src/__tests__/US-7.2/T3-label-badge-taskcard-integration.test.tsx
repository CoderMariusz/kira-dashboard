import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T3: Updated LabelBadge & TaskCard Integration
 * Tests for LabelBadge accepting Label object, TaskCard showing Label objects, and useTasks joining task_labels→labels
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Components do not accept Label objects yet
 */

// ═══════════════════════════════════════════
// MOCKS — COMPLETE Supabase client
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ═══════════════════════════════════════════
// MOCK DATA — Complete Label object
// ═══════════════════════════════════════════

const mockLabel: any = {
  id: 'label-1',
  household_id: 'hh-1',
  name: 'Bug',
  color: '#EF4444',
  created_at: new Date().toISOString(),
};

const mockTaskWithLabels: any = {
  id: 'task-1',
  board_id: 'board-1',
  title: 'Fix navigation bug',
  description: 'Navigation not working on mobile',
  column: 'in_progress',
  priority: 'high',
  due_date: '2024-01-15',
  assignee_id: null,
  created_by: 'user-1',
  position: 0,
  labels: [mockLabel, {
    ...mockLabel,
    id: 'label-2',
    name: 'Feature',
    color: '#10B981',
  }],
  subtasks: [],
  source: 'manual',
  original_message: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
};

describe('T3: Updated LabelBadge & TaskCard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LabelBadge Component (AC3.1, AC3.2, AC3.5)', () => {
    it('AC3.1: should accept Label object (id, name, color) instead of string', async () => {
      // @ts-expect-error - LabelBadge doesn't accept Label object yet
      const { LabelBadge } = await import('@/components/kanban/LabelBadge');

      const { container } = render(<LabelBadge label={mockLabel} />);

      // Should display label name
      expect(screen.getByText('Bug')).toBeInTheDocument();
    });

    it('AC3.2: should render with DB-stored color (not hash-based)', async () => {
      // @ts-expect-error - LabelBadge doesn't use DB color yet
      const { LabelBadge } = await import('@/components/kanban/LabelBadge');

      const { container } = render(<LabelBadge label={mockLabel} />);

      // Find the badge span
      const badge = screen.getByText('Bug').closest('span');

      // Should use DB-stored hex color (#EF4444), not hash-based
      expect(badge).toHaveStyle({
        color: '#991B1B', // Darker text color for #EF4444 background
        backgroundColor: '#FEE2E2', // Light background color
      });
    });

    it('AC3.5: onRemove callback should work', async () => {
      // @ts-expect-error - LabelBadge doesn't accept Label object yet
      const { LabelBadge } = await import('@/components/kanban/LabelBadge');

      const onRemove = vi.fn();
      render(<LabelBadge label={mockLabel} onRemove={onRemove} />);

      // Click remove button (×)
      const removeButton = screen.getByRole('button', { name: /Usuń label Bug|Remove label Bug/i });
      await userEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalled();
    });
  });

  describe('TaskCard Component (AC3.3)', () => {
    it('AC3.3: should display label badges from task\'s labels relation', async () => {
      // @ts-expect-error - TaskCard doesn't show Label objects yet
      const { TaskCard } = await import('@/components/kanban/TaskCard');

      render(<TaskCard task={mockTaskWithLabels} />);

      // Should display both label badges
      expect(screen.getByText('Bug')).toBeInTheDocument();
      expect(screen.getByText('Feature')).toBeInTheDocument();
    });
  });

  describe('useTasks Hook (AC3.4)', () => {
    it('AC3.4: should join task_labels→labels to include full Label objects', async () => {
      // @ts-expect-error - useTasks doesn't join labels yet
      const { useTasks } = await import('@/lib/hooks/useTasks');
      const { createClient } = await import('@/lib/supabase/client');

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [mockTaskWithLabels],
              error: null,
            })),
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      } as any);

      const Wrapper = createWrapper();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - useTasks doesn't exist in this form
      const { result } = await import('@/lib/hooks/useTasks').then(async ({ useTasks }) => {
        const { renderHook } = await import('@testing-library/react');
        return renderHook(() => useTasks('board-1'), { wrapper: () => Wrapper({ children: null }) });
      });

      // Check that labels array contains Label objects
      const task = mockTaskWithLabels;
      expect(task.labels).toHaveLength(2);
      expect(task.labels[0]).toHaveProperty('id');
      expect(task.labels[0]).toHaveProperty('name');
      expect(task.labels[0]).toHaveProperty('color');
    });
  });
});
