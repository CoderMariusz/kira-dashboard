import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T2: Responsive Typography Tests
 * Mobile-first typography with responsive sizing
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Typography implementation does not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
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

describe('T2: Responsive Typography', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Body Text (AC2.1)', () => {
    it('AC2.1: body text should use text-base on mobile (16px)', async () => {
      // Will test against actual components that use body text
      const { TaskCard } = await import('@/components/kanban/TaskCard');

      render(<TaskCard task={{
        id: '1',
        title: 'Test task',
        description: 'This is body text',
        column: 'todo',
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }} onEdit={vi.fn()} onDelete={vi.fn()} />);

      const bodyText = screen.getByText('This is body text');
      expect(bodyText).toHaveClass('text-base');
    });

    it('AC2.1: body text should use md:text-sm on desktop (14px)', async () => {
      const { TaskCard } = await import('@/components/kanban/TaskCard');

      render(<TaskCard task={{
        id: '1',
        title: 'Test task',
        description: 'This is body text',
        column: 'todo',
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }} onEdit={vi.fn()} onDelete={vi.fn()} />);

      const bodyText = screen.getByText('This is body text');
      expect(bodyText).toHaveClass('md:text-sm');
    });
  });

  describe('Headings - h1 (AC2.2)', () => {
    it('AC2.2: h1 should be text-2xl on mobile', async () => {
      const { BoardSkeleton } = await import('@/components/kanban/BoardSkeleton');

      render(<BoardSkeleton columns={3} />);

      // Test that h1 elements use text-2xl
      const headings = screen.getAllByRole('heading', { level: 1 });
      headings.forEach(heading => {
        expect(heading).toHaveClass('text-2xl');
      });
    });

    it('AC2.2: h1 should be md:text-3xl on desktop', async () => {
      const { BoardSkeleton } = await import('@/components/kanban/BoardSkeleton');

      render(<BoardSkeleton columns={3} />);

      const headings = screen.getAllByRole('heading', { level: 1 });
      headings.forEach(heading => {
        expect(heading).toHaveClass('md:text-3xl');
      });
    });

    it('AC2.2: h1 should be lg:text-4xl on large screens', async () => {
      const { BoardSkeleton } = await import('@/components/kanban/BoardSkeleton');

      render(<BoardSkeleton columns={3} />);

      const headings = screen.getAllByRole('heading', { level: 1 });
      headings.forEach(heading => {
        expect(heading).toHaveClass('lg:text-4xl');
      });
    });
  });

  describe('Headings - h2 (AC2.3)', () => {
    it('AC2.3: h2 should be text-xl on mobile', async () => {
      const { Column } = await import('@/components/kanban/Column');
      const Wrapper = createWrapper();

      render(<Wrapper><Column
        boardId="board-1"
        config={{ key: 'todo', label: 'To Do', color: '#3B82F6' }}
        tasks={[]}
        onTaskClick={vi.fn()}
      /></Wrapper>);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveClass('text-xl');
    });

    it('AC2.3: h2 should be md:text-2xl on desktop', async () => {
      const { Column } = await import('@/components/kanban/Column');
      const Wrapper = createWrapper();

      render(<Wrapper><Column
        boardId="board-1"
        config={{ key: 'todo', label: 'To Do', color: '#3B82F6' }}
        tasks={[]}
        onTaskClick={vi.fn()}
      /></Wrapper>);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveClass('md:text-2xl');
    });
  });

  describe('Labels and Metadata (AC2.4)', () => {
    it('AC2.4: labels/metadata should use text-sm on mobile', async () => {
      const { TaskCard } = await import('@/components/kanban/TaskCard');

      render(<TaskCard task={{
        id: '1',
        title: 'Test task',
        column: 'todo',
        priority: 'high',
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }} onEdit={vi.fn()} onDelete={vi.fn()} />);

      const metadata = screen.getByText(/high/i);
      expect(metadata).toHaveClass('text-sm');
    });

    it('AC2.4: labels/metadata should use md:text-xs on desktop', async () => {
      const { TaskCard } = await import('@/components/kanban/TaskCard');

      render(<TaskCard task={{
        id: '1',
        title: 'Test task',
        column: 'todo',
        priority: 'high',
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }} onEdit={vi.fn()} onDelete={vi.fn()} />);

      const metadata = screen.getByText(/high/i);
      expect(metadata).toHaveClass('md:text-xs');
    });

    it('AC2.4: task due dates should use responsive text sizes', async () => {
      const { TaskCard } = await import('@/components/kanban/TaskCard');

      render(<TaskCard task={{
        id: '1',
        title: 'Test task',
        column: 'todo',
        due_date: '2024-01-15',
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // TaskCard formats dates using date-fns (Polish locale) so we find by data attribute
      const dueDate = document.querySelector('[data-due-date="2024-01-15"]');
      expect(dueDate).toBeInTheDocument();
      expect(dueDate).toHaveClass('text-sm', 'md:text-xs');
    });
  });

  describe('Typography in Dialogs/Modals', () => {
    it('dialog titles should use responsive h1 sizing', async () => {
      // Verify via source since TaskModal needs full store/query setup
      const fs = await import('fs');
      const path = await import('path');
      const modalPath = path.join(process.cwd(), 'src/components/kanban/TaskModal.tsx');
      const content = fs.readFileSync(modalPath, 'utf-8');

      // Dialog title should use responsive sizing
      expect(content).toMatch(/text-2xl/);
      expect(content).toMatch(/md:text-3xl/);
    });
  });
});
