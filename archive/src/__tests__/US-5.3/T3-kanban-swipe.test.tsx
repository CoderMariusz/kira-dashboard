import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T3: Kanban Swipeable Columns Tests
 * Swipe navigation between columns on mobile
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Swipe implementation and ColumnIndicator do not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

const mockSubscribe = vi.fn(() => ({}));
const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
const mockChannel = vi.fn(() => ({ on: mockOn }));
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/hooks/useRealtime', () => ({
  useTasksRealtime: vi.fn(),
}));

vi.mock('@/lib/hooks/useBoard', () => ({
  useBoard: () => ({ data: { id: 'board-1', type: 'home', household_id: 'h1', name: 'Home' }, isLoading: false, error: null }),
}));

vi.mock('@/lib/hooks/useTasks', () => ({
  useTasks: () => ({ data: [], isLoading: false, error: null }),
  useMoveTask: () => ({ mutate: vi.fn() }),
  useCreateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTask: () => ({ data: null, isLoading: false }),
  useUpdateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/store', () => ({
  useUIStore: (selector: any) => {
    const state = { taskModalOpen: false, editingTaskId: null, openTaskModal: vi.fn(), closeTaskModal: vi.fn() };
    return selector(state);
  },
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

describe('T3: Kanban Swipeable Columns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Board Component - Mobile Layout (AC3.1)', () => {
    it('AC3.1: mobile Board should stack vertically on small screens and scroll on sm+', async () => {
      const { Board } = await import('@/components/kanban/Board');
      const Wrapper = createWrapper();

      render(<Wrapper><Board type="home" /></Wrapper>);

      const boardContainer = screen.getByTestId('kanban-board');
      // Small phones: vertical stack (flex-col)
      expect(boardContainer).toHaveClass('flex-col');
      // Larger phones: horizontal scroll with snap
      expect(boardContainer).toHaveClass('sm:flex-row');
      expect(boardContainer).toHaveClass('sm:overflow-x-auto');
    });

    it('AC3.1: Board should have snap scrolling on sm+ breakpoint', async () => {
      const { Board } = await import('@/components/kanban/Board');
      const Wrapper = createWrapper();

      render(<Wrapper><Board type="home" /></Wrapper>);

      const boardContainer = screen.getByTestId('kanban-board');
      expect(boardContainer).toHaveClass('sm:snap-x');
      expect(boardContainer).toHaveClass('sm:snap-mandatory');
    });

    it('AC3.1: Board should hide scrollbar on sm+', async () => {
      const { Board } = await import('@/components/kanban/Board');
      const Wrapper = createWrapper();

      render(<Wrapper><Board type="home" /></Wrapper>);

      const boardContainer = screen.getByTestId('kanban-board');
      expect(boardContainer).toHaveClass('sm:scrollbar-hide');
    });
  });

  describe('Column Component - Mobile Sizing (AC3.2)', () => {
    it('AC3.2: each column should be flex-none on sm+ to prevent shrinking', async () => {
      const { Column } = await import('@/components/kanban/Column');
      const Wrapper = createWrapper();

      render(<Wrapper><Column
        boardId="board-1"
        config={{ key: 'todo', label: 'To Do', color: '#3B82F6' }}
        tasks={[]}
        onTaskClick={vi.fn()}
      /></Wrapper>);

      const column = screen.getByRole('region');
      expect(column).toHaveClass('sm:flex-none');
    });

    it('AC3.2: each column should be sm:w-[85vw] on tablets (85% viewport width)', async () => {
      const { Column } = await import('@/components/kanban/Column');
      const Wrapper = createWrapper();

      render(<Wrapper><Column
        boardId="board-1"
        config={{ key: 'todo', label: 'To Do', color: '#3B82F6' }}
        tasks={[]}
        onTaskClick={vi.fn()}
      /></Wrapper>);

      const column = screen.getByRole('region');
      expect(column).toHaveClass('sm:w-[85vw]');
    });

    it('AC3.2: each column should have snap-center on sm+ to align in viewport', async () => {
      const { Column } = await import('@/components/kanban/Column');
      const Wrapper = createWrapper();

      render(<Wrapper><Column
        boardId="board-1"
        config={{ key: 'todo', label: 'To Do', color: '#3B82F6' }}
        tasks={[]}
        onTaskClick={vi.fn()}
      /></Wrapper>);

      const column = screen.getByRole('region');
      expect(column).toHaveClass('sm:snap-center');
    });
  });

  describe('Board Component - Desktop Layout (AC3.3)', () => {
    it('AC3.3: desktop Board should use grid layout on lg+', async () => {
      const { Board } = await import('@/components/kanban/Board');
      const Wrapper = createWrapper();

      render(<Wrapper><Board type="home" /></Wrapper>);

      const boardContainer = screen.getByTestId('kanban-board');
      expect(boardContainer).toHaveClass('lg:grid');
    });
  });

  describe('Scrollbar Hide Utility (AC3.4)', () => {
    it('AC3.4: scrollbar-hide utility should exist in globals.css', async () => {
      // This tests that the utility class exists in CSS
      const fs = await import('fs');
      const path = await import('path');

      const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
      const cssContent = fs.readFileSync(globalsPath, 'utf-8');

      expect(cssContent).toMatch(/scrollbar-hide/);
    });
  });

  describe('ColumnIndicator Component (AC3.5)', () => {
    it('AC3.5: ColumnIndicator component should be exported', async () => {
      const { ColumnIndicator } = await import('@/components/kanban/ColumnIndicator');

      expect(ColumnIndicator).toBeDefined();
    });

    it('AC3.5: ColumnIndicator should render dot indicators for each column', async () => {
      const { ColumnIndicator } = await import('@/components/kanban/ColumnIndicator');

      render(<ColumnIndicator activeIndex={0} total={3} />);

      const dots = screen.getAllByRole('button');
      expect(dots).toHaveLength(3);
    });

    it('AC3.5: ColumnIndicator should be hidden on desktop (md:hidden)', async () => {
      const { ColumnIndicator } = await import('@/components/kanban/ColumnIndicator');

      const { container } = render(<ColumnIndicator activeIndex={0} total={3} />);

      const indicator = container.firstChild;
      expect(indicator).toHaveClass('md:hidden');
    });
  });

  describe('Active Column Dot (AC3.6)', () => {
    it('AC3.6: active column dot should have blue-600 background', async () => {
      const { ColumnIndicator } = await import('@/components/kanban/ColumnIndicator');

      render(<ColumnIndicator activeIndex={0} total={3} />);

      const activeDot = screen.getAllByRole('button')[0];
      expect(activeDot).toHaveClass('bg-blue-600');
    });

    it('AC3.6: inactive dots should have gray-300 background', async () => {
      const { ColumnIndicator } = await import('@/components/kanban/ColumnIndicator');

      render(<ColumnIndicator activeIndex={0} total={3} />);

      const inactiveDots = screen.getAllByRole('button').slice(1);
      inactiveDots.forEach(dot => {
        expect(dot).toHaveClass('bg-gray-300');
      });
    });
  });
});
