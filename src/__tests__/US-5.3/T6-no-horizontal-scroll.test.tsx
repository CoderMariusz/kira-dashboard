import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T6: No Horizontal Scroll Tests
 * Prevent horizontal scrolling on all breakpoints
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Overflow implementation does not exist yet
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

vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter-mock' }),
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

describe('T6: No Horizontal Scroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Body Overflow (AC6.1)', () => {
    it('AC6.1: body element should have overflow-x-hidden', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

      // Check that body has overflow-x-hidden
      expect(layoutContent).toMatch(/overflow-x-hidden/);
    });

    it('AC6.1: globals.css should include overflow-x-hidden rule', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
      const cssContent = fs.readFileSync(globalsPath, 'utf-8');

      expect(cssContent).toMatch(/overflow-x-hidden/);
    });
  });

  describe('Layout Component', () => {
    it('AC6.1: layout.tsx body element should have overflow-x-hidden class', async () => {
      // Test via file content since RootLayout renders <html> which jsdom struggles with
      const fs = await import('fs');
      const path = await import('path');

      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

      // Body element should contain overflow-x-hidden in className
      expect(layoutContent).toMatch(/body.*className.*overflow-x-hidden/s);
    });
  });

  describe('Board Component - No Horizontal Overflow (AC6.2)', () => {
    it('AC6.2: Board should not cause horizontal scroll on mobile', async () => {
      const { Board } = await import('@/components/kanban/Board');
      const Wrapper = createWrapper();

      render(<Wrapper><Board type="home" /></Wrapper>);

      const boardContainer = screen.getByTestId('kanban-board');
      expect(boardContainer).not.toHaveClass('overflow-x-visible');
      // Mobile: overflow-x-auto for controlled horizontal scroll (snap)
      expect(boardContainer).toHaveClass('overflow-x-auto');
    });

    it('AC6.2: Board should not cause horizontal scroll on tablet', async () => {
      const { Board } = await import('@/components/kanban/Board');
      const Wrapper = createWrapper();

      render(<Wrapper><Board type="home" /></Wrapper>);

      const boardContainer = screen.getByTestId('kanban-board');
      expect(boardContainer).not.toHaveClass('md:overflow-x-visible');
      // Desktop/tablet: overflow hidden via md: breakpoint
      expect(boardContainer).toHaveClass('md:overflow-x-hidden');
    });

    it('AC6.2: Board should not cause horizontal scroll on desktop', async () => {
      const { Board } = await import('@/components/kanban/Board');
      const Wrapper = createWrapper();

      render(<Wrapper><Board type="home" /></Wrapper>);

      const boardContainer = screen.getByTestId('kanban-board');
      expect(boardContainer).not.toHaveClass('overflow-x-visible');
      // Desktop uses md:grid + md:overflow-x-hidden (md covers lg+)
      expect(boardContainer).toHaveClass('md:overflow-x-hidden');
    });
  });

  describe('Column Component - No Horizontal Overflow', () => {
    it('AC6.2: Column should not overflow horizontally', async () => {
      const { Column } = await import('@/components/kanban/Column');
      const Wrapper = createWrapper();

      render(<Wrapper><Column
        boardId="board-1"
        config={{ key: 'todo', label: 'To Do', color: '#3B82F6' }}
        tasks={[]}
        onTaskClick={vi.fn()}
      /></Wrapper>);

      const column = screen.getByRole('region');
      // Column has max-w-full to prevent overflow + md:w-full for desktop
      expect(column).toHaveClass('max-w-full');
      expect(column).not.toHaveClass('w-screen', 'min-w-screen');
    });
  });

  describe('TaskCard Component - No Horizontal Overflow', () => {
    it('AC6.2: TaskCard should not overflow horizontally', async () => {
      const { TaskCard } = await import('@/components/kanban/TaskCard');

      render(<TaskCard task={{
        id: '1',
        title: 'Test task with a very long title that might cause horizontal overflow on mobile devices',
        description: 'This is also a very long description that should not cause horizontal scrolling issues',
        column: 'todo',
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }} onEdit={vi.fn()} onDelete={vi.fn()} />);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('overflow-hidden');
    });

    it('AC6.2: TaskCard text should wrap properly', async () => {
      const { TaskCard } = await import('@/components/kanban/TaskCard');

      render(<TaskCard task={{
        id: '1',
        title: 'Long title that should wrap to multiple lines without causing horizontal scroll',
        column: 'todo',
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }} onEdit={vi.fn()} onDelete={vi.fn()} />);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('whitespace-normal');
      expect(card).not.toHaveClass('whitespace-nowrap');
    });
  });

  describe('Modal Components - No Horizontal Overflow', () => {
    it('AC6.2: TaskModal should not cause horizontal scroll', async () => {
      const { TaskModal } = await import('@/components/kanban/TaskModal');
      const Wrapper = createWrapper();

      render(<Wrapper><TaskModal boardType="home" boardId="board-1" /></Wrapper>);

      // TaskModal uses Dialog which constrains width via max-w-lg/max-w-2xl
      // Verify no overflow-x-visible in the modal's source
      const fs = await import('fs');
      const path = await import('path');
      const modalPath = path.join(process.cwd(), 'src/components/kanban/TaskModal.tsx');
      const content = fs.readFileSync(modalPath, 'utf-8');
      expect(content).not.toMatch(/overflow-x-visible/);
    });
  });

  describe('Form Components - No Horizontal Overflow', () => {
    it('AC6.2: Input component should not cause horizontal scroll', async () => {
      const { Input } = await import('@/components/ui/input');

      const { container } = render(<Input placeholder="Enter text" />);
      const input = container.querySelector('input');

      expect(input).toHaveClass('w-full');
      expect(input).not.toHaveClass('min-w-screen');
    });
  });

  describe('Navigation Components - No Horizontal Overflow', () => {
    it('AC6.2: MobileNav should not cause horizontal scroll', async () => {
      const { MobileNav } = await import('@/components/layout/MobileNav');

      render(<MobileNav />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('w-full');
      expect(nav).not.toHaveClass('overflow-x-auto');
    });

    it('AC6.2: Sidebar should not cause horizontal scroll', async () => {
      const { Sidebar } = await import('@/components/layout/Sidebar');

      render(<Sidebar />);

      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('w-64', 'max-w-full');
      expect(sidebar).not.toHaveClass('min-w-screen');
    });
  });

  describe('No Element Causes Horizontal Scroll (AC6.2)', () => {
    it('AC6.2: no component should use overflow-x-visible class', async () => {
      const fs = await import('fs');
      const path = await import('path');

      // Check that no component files have overflow-x-visible
      const componentsPath = path.join(process.cwd(), 'src/components');
      const getAllFiles = (dir: string, files: string[] = []) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            getAllFiles(fullPath, files);
          } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
        return files;
      };

      const files = getAllFiles(componentsPath);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        // Should not have overflow-x-visible anywhere in components
        expect(content).not.toMatch(/overflow-x-visible/);
      }
    });

    it('AC6.2: all breakpoint-specific overflows should be hidden', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
      const cssContent = fs.readFileSync(globalsPath, 'utf-8');

      // All overflow-x variants should be hidden
      expect(cssContent).toMatch(/overflow-x-hidden/);
      expect(cssContent).toMatch(/overflow-x-hidden.*md:overflow-x-hidden/);
      expect(cssContent).toMatch(/overflow-x-hidden.*lg:overflow-x-hidden/);
    });
  });
});
