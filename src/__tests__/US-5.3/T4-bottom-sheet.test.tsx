import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * T4: Bottom Sheet Modals Tests
 * Bottom sheet modals using vaul library
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * BottomSheet and useMediaQuery do not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

// Mock window.matchMedia for useMediaQuery
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

describe('T4: Bottom Sheet Modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useMediaQuery Hook (AC4.6)', () => {
    it('AC4.6: useMediaQuery hook should be exported', async () => {
      const { useMediaQuery } = await import('@/hooks/use-media-query');

      expect(useMediaQuery).toBeDefined();
    });

    it('AC4.6: useMediaQuery should return true when media query matches', async () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { useMediaQuery } = await import('@/hooks/use-media-query');

      function TestComponent() {
        const isDesktop = useMediaQuery('(min-width: 768px)');
        return <div>{isDesktop ? 'Desktop' : 'Mobile'}</div>;
      }

      render(<TestComponent />);

      expect(screen.getByText('Desktop')).toBeInTheDocument();
    });

    it('AC4.6: useMediaQuery should return false when media query does not match', async () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { useMediaQuery } = await import('@/hooks/use-media-query');

      function TestComponent() {
        const isDesktop = useMediaQuery('(min-width: 768px)');
        return <div>{isDesktop ? 'Desktop' : 'Mobile'}</div>;
      }

      render(<TestComponent />);

      expect(screen.getByText('Mobile')).toBeInTheDocument();
    });
  });

  describe('BottomSheet Component (AC4.1)', () => {
    it('AC4.1: BottomSheet component should be exported', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      expect(BottomSheet).toBeDefined();
    });

    it('AC4.1: BottomSheet should render when open is true', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Sheet content</div>
        </BottomSheet>
      );

      expect(screen.getByText('Sheet content')).toBeInTheDocument();
    });

    it('AC4.1: BottomSheet should not render when open is false', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      render(
        <BottomSheet open={false} onOpenChange={vi.fn()}>
          <div>Sheet content</div>
        </BottomSheet>
      );

      expect(screen.queryByText('Sheet content')).not.toBeInTheDocument();
    });
  });

  describe('Drag Handle (AC4.2)', () => {
    it('AC4.2: BottomSheet should have drag handle visible at top', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      const handle = container.querySelector('[data-drawer-handle]');
      expect(handle).toBeInTheDocument();
    });

    it('AC4.2: drag handle should have styling indicating interactability', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      const handle = container.querySelector('[data-drawer-handle]');
      expect(handle).toHaveClass('rounded-full', 'bg-gray-300');
    });
  });

  describe('Swipe to Close (AC4.3)', () => {
    it('AC4.3: BottomSheet should support swipe down to close gesture', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      // Vaul Drawer adds data-drawer-overlay for swipe gestures
      const overlay = container.querySelector('[data-drawer-overlay]');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Backdrop Overlay (AC4.4)', () => {
    it('AC4.4: BottomSheet should have backdrop overlay', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      const overlay = container.querySelector('[data-drawer-overlay]');
      expect(overlay).toBeInTheDocument();
    });

    it('AC4.4: backdrop should have bg-black/40 for 40% opacity', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      const overlay = container.querySelector('[data-drawer-overlay]');
      expect(overlay).toHaveClass('bg-black/40');
    });
  });

  describe('Max Height and Scroll (AC4.5)', () => {
    it('AC4.5: BottomSheet should have max-h-[96vh] for maximum height', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      const content = container.querySelector('[data-drawer-content]');
      expect(content).toHaveClass('max-h-[96vh]');
    });

    it('AC4.5: BottomSheet should have overflow-y-auto for scrollable content', async () => {
      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      const content = container.querySelector('[data-drawer-content]');
      expect(content).toHaveClass('overflow-y-auto');
    });
  });

  describe('Responsive Behavior (AC4.7)', () => {
    it('AC4.7: should use bottom sheet on mobile (<768px)', async () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      // On mobile, should render Vaul drawer
      const drawer = container.querySelector('[data-drawer]');
      expect(drawer).toBeInTheDocument();
    });

    it('AC4.7: should use normal dialog on desktop (>=768px)', async () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(min-width: 768px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { BottomSheet } = await import('@/components/ui/bottom-sheet');

      const { container } = render(
        <BottomSheet open={true} onOpenChange={vi.fn()}>
          <div>Content</div>
        </BottomSheet>
      );

      // On desktop, should render Dialog instead of Vaul drawer
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();

      const drawer = container.querySelector('[data-drawer]');
      expect(drawer).not.toBeInTheDocument();
    });
  });
});
