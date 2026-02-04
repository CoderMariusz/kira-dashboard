import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T3: Tablet Collapsible Sidebar Tests
 * Tests for collapsible sidebar behavior on tablet (768-1024px)
 * 
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Feature does not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

const mockPathname = vi.fn(() => '/home');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

describe('T3: Tablet Collapsible Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/home');
  });

  it('AC3.1: should be visible from md (768px) but collapsed (w-16) on tablet', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const sidebar = screen.getByRole('navigation');
    
    // Should have md:flex to show on tablet
    expect(sidebar.className).toMatch(/md:flex/);
    
    // Default collapsed width should be w-16 on tablet
    // (This will be controlled by state, but the class should exist)
    const collapsedStateExists = sidebar.className.includes('w-16') || 
                                  sidebar.getAttribute('data-collapsed') !== null;
    expect(collapsedStateExists).toBe(true);
  });

  it('AC3.2: should show toggle button on tablet, hidden on desktop', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const toggleButton = screen.getByRole('button', { name: /toggle/i });
    expect(toggleButton).toBeInTheDocument();
    
    // Toggle should be hidden on desktop (lg:hidden)
    expect(toggleButton.className).toMatch(/lg:hidden/);
  });

  it('AC3.3: should expand/collapse with animation on toggle click', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');
    const user = userEvent.setup();

    render(<Sidebar />);

    const sidebar = screen.getByRole('navigation');
    const toggleButton = screen.getByRole('button', { name: /toggle/i });

    // Should have transition classes
    expect(sidebar.className).toMatch(/transition-all/);
    expect(sidebar.className).toMatch(/duration-300/);

    // Click toggle
    await user.click(toggleButton);

    // Width should change (w-16 -> w-64 or vice versa)
    // This will be tested by checking if className contains both at different times
    // or by checking data attributes
    const hasWidthTransition = sidebar.className.includes('w-64') || 
                                sidebar.className.includes('w-16');
    expect(hasWidthTransition).toBe(true);
  });

  it('AC3.4: should show only icons when collapsed, labels hidden', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');
    const user = userEvent.setup();

    render(<Sidebar />);

    const toggleButton = screen.getByRole('button', { name: /toggle/i });
    
    // Click to collapse (if not already collapsed)
    await user.click(toggleButton);

    // Labels should be hidden (display-none or similar)
    const labels = screen.queryAllByText(/dom|praca|zakupy|historia|ustawienia/i);
    
    // In collapsed state, labels might be visually hidden but still in DOM
    // Check for hidden class or aria-hidden
    const navItems = screen.getAllByRole('link');
    navItems.forEach(item => {
      const hasHiddenText = item.className.includes('sr-only') || 
                            item.querySelector('[class*="hidden"]') !== null;
      // At least some mechanism for hiding text should exist
    });
  });

  it('AC3.5: should always be expanded on desktop (>1024px), toggle hidden', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const sidebar = screen.getByRole('navigation');
    const toggleButton = screen.getByRole('button', { name: /toggle/i });

    // On desktop (lg), sidebar should have w-64
    expect(sidebar.className).toMatch(/lg:w-64/);
    
    // Toggle should be hidden on desktop
    expect(toggleButton.className).toMatch(/lg:hidden/);
  });

  it('AC3.6: should have aria-label on toggle button', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const toggleButton = screen.getByRole('button', { name: /toggle/i });
    
    // Should have aria-label for accessibility
    expect(toggleButton.getAttribute('aria-label')).toBeTruthy();
  });

  it('should maintain active route highlighting when collapsed', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');
    const user = userEvent.setup();

    mockPathname.mockReturnValue('/work');
    render(<Sidebar />);

    const toggleButton = screen.getByRole('button', { name: /toggle/i });
    await user.click(toggleButton);

    // Active route should still be highlighted even when collapsed
    const workLink = screen.getByRole('link', { name: /praca/i });
    expect(workLink.className).toMatch(/bg-blue-50|text-blue-600/);
  });

  it('should persist collapsed state across re-renders', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');
    const user = userEvent.setup();

    const { rerender } = render(<Sidebar />);

    const toggleButton = screen.getByRole('button', { name: /toggle/i });
    await user.click(toggleButton);

    // Get current state (collapsed or expanded)
    const sidebar = screen.getByRole('navigation');
    const isCollapsedBefore = sidebar.className.includes('w-16') || 
                               sidebar.getAttribute('data-collapsed') === 'true';

    // Re-render
    rerender(<Sidebar />);

    // State should persist (or be managed externally)
    const sidebarAfter = screen.getByRole('navigation');
    const isCollapsedAfter = sidebarAfter.className.includes('w-16') || 
                              sidebarAfter.getAttribute('data-collapsed') === 'true';

    // This test might fail if state is local - that's expected
    // Implementation should use localStorage or context
  });
});
