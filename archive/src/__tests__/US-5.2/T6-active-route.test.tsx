import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * T6: Active Route Highlighting Tests
 * Verifies that MobileNav and Sidebar highlight active routes consistently
 * 
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Implementation does not exist yet
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

describe('T6: Active Route Highlighting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/home');
  });

  it('AC6.1: MobileNav and Sidebar should highlight same route consistently', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/work');

    const { container } = render(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    // Get all "Praca" links from both components
    const workLinks = screen.getAllByText(/praca/i).map(el => el.closest('a'));

    // All should be highlighted
    workLinks.forEach(link => {
      expect(link?.className).toMatch(/blue-600|bg-blue-50/);
    });
  });

  it('AC6.2: should highlight "Dom" when on /home route', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/home');

    render(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    const homeLinks = screen.getAllByText(/dom/i).map(el => el.closest('a'));

    // All Home links should be active
    homeLinks.forEach(link => {
      expect(link?.className).toMatch(/blue-600|bg-blue-50/);
    });

    // Other links should not be active
    const workLinks = screen.getAllByText(/praca/i).map(el => el.closest('a'));
    workLinks.forEach(link => {
      expect(link?.className).not.toMatch(/bg-blue-50/);
      expect(link?.className).toMatch(/gray/);
    });
  });

  it('AC6.3: should highlight "Praca" when on /work route', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/work');

    render(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    const workLinks = screen.getAllByText(/praca/i).map(el => el.closest('a'));

    // All Work links should be active
    workLinks.forEach(link => {
      expect(link?.className).toMatch(/blue-600|bg-blue-50/);
    });
  });

  it('AC6.4: should highlight "Zakupy" when on /shopping route', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/shopping');

    render(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    const shoppingLinks = screen.getAllByText(/zakupy/i).map(el => el.closest('a'));

    // All Shopping links should be active
    shoppingLinks.forEach(link => {
      expect(link?.className).toMatch(/blue-600|bg-blue-50/);
    });
  });

  it('AC6.5: should highlight "Historia" when on /activity route', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/activity');

    render(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    const activityLinks = screen.getAllByText(/historia/i).map(el => el.closest('a'));

    // All Activity links should be active
    activityLinks.forEach(link => {
      expect(link?.className).toMatch(/blue-600|bg-blue-50/);
    });
  });

  it('should update highlighting when route changes', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/home');

    const { rerender } = render(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    // Initially on /home
    let homeLinks = screen.getAllByText(/dom/i).map(el => el.closest('a'));
    homeLinks.forEach(link => {
      expect(link?.className).toMatch(/blue-600|bg-blue-50/);
    });

    // Change to /shopping
    mockPathname.mockReturnValue('/shopping');
    rerender(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    // Now shopping should be active
    const shoppingLinks = screen.getAllByText(/zakupy/i).map(el => el.closest('a'));
    shoppingLinks.forEach(link => {
      expect(link?.className).toMatch(/blue-600|bg-blue-50/);
    });

    // Home should no longer be active
    homeLinks = screen.getAllByText(/dom/i).map(el => el.closest('a'));
    homeLinks.forEach(link => {
      expect(link?.className).not.toMatch(/bg-blue-50/);
    });
  });

  it('should highlight Settings in Sidebar only (not in MobileNav)', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/settings');

    render(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    // Settings should only appear in Sidebar
    const settingsLinks = screen.getAllByText(/ustawienia/i);
    
    // Should have exactly 1 settings link (from Sidebar)
    expect(settingsLinks).toHaveLength(1);

    const settingsLink = settingsLinks[0].closest('a');
    expect(settingsLink?.className).toMatch(/blue-600|bg-blue-50/);
  });

  it('should use the same highlighting logic in both components', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/work');

    render(
      <>
        <MobileNav />
        <Sidebar />
      </>
    );

    // Get active links from both components
    const activeLinks = screen.getAllByText(/praca/i).map(el => el.closest('a'));

    // All active links should have consistent styling
    const allHaveBlueText = activeLinks.every(link => 
      link?.className.includes('blue-600')
    );
    const allHaveBlueBackground = activeLinks.every(link => 
      link?.className.includes('bg-blue') || link?.className.includes('text-blue')
    );

    expect(allHaveBlueText || allHaveBlueBackground).toBe(true);
  });
});
