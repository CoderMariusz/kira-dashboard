import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * T1: MobileNav Component Tests
 * Bottom navigation bar for mobile devices (<768px)
 * 
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Component does not exist yet
 */

// ═══════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════

const mockPush = vi.fn();
const mockPathname = vi.fn(() => '/home');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

describe('T1: MobileNav Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/home');
  });

  it('AC1.1: should render bottom nav bar fixed at bottom of screen', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    render(<MobileNav />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    
    // Should have fixed positioning classes
    expect(nav.className).toMatch(/fixed/);
    expect(nav.className).toMatch(/bottom-0/);
  });

  it('AC1.2: should only be visible on mobile (<768px) with md:hidden class', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    render(<MobileNav />);

    const nav = screen.getByRole('navigation');
    expect(nav.className).toMatch(/md:hidden/);
  });

  it('AC1.3: should render 4 navigation items: Home, Work, Shopping, Activity', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    render(<MobileNav />);

    expect(screen.getByText(/dom/i)).toBeInTheDocument();
    expect(screen.getByText(/praca/i)).toBeInTheDocument();
    expect(screen.getByText(/zakupy/i)).toBeInTheDocument();
    expect(screen.getByText(/historia/i)).toBeInTheDocument();
  });

  it('AC1.4: should display Lucide icons: Home, Briefcase, ShoppingCart, Activity', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    render(<MobileNav />);

    // Icons should be present (using svg role or data-testid)
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    
    // Each link should contain an svg icon
    links.forEach(link => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('AC1.5: should highlight active route (blue-600) and show inactive routes (gray-600)', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    mockPathname.mockReturnValue('/home');
    render(<MobileNav />);

    const homeLink = screen.getByText(/dom/i).closest('a');
    const workLink = screen.getByText(/praca/i).closest('a');

    // Active route should have blue-600
    expect(homeLink?.className).toMatch(/blue-600/);
    
    // Inactive routes should have gray-600
    expect(workLink?.className).toMatch(/gray-600/);
  });

  it('AC1.6: should use usePathname() to detect active route', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    mockPathname.mockReturnValue('/work');
    const { rerender } = render(<MobileNav />);

    const workLink = screen.getByText(/praca/i).closest('a');
    expect(workLink?.className).toMatch(/blue-600/);

    // Change pathname and verify active state updates
    mockPathname.mockReturnValue('/shopping');
    rerender(<MobileNav />);

    const shoppingLink = screen.getByText(/zakupy/i).closest('a');
    expect(shoppingLink?.className).toMatch(/blue-600/);
  });

  it('AC1.7: should navigate when nav items are clicked', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');
    const user = userEvent.setup();

    render(<MobileNav />);

    const workLink = screen.getByText(/praca/i).closest('a');
    expect(workLink?.getAttribute('href')).toBe('/work');

    const shoppingLink = screen.getByText(/zakupy/i).closest('a');
    expect(shoppingLink?.getAttribute('href')).toBe('/shopping');
  });

  it('AC1.8: should have z-50 z-index', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    render(<MobileNav />);

    const nav = screen.getByRole('navigation');
    expect(nav.className).toMatch(/z-50/);
  });

  it('AC1.9: should have smooth color transitions', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    render(<MobileNav />);

    const links = screen.getAllByRole('link');
    
    // At least one link should have transition-colors
    const hasTransition = links.some(link => 
      link.className.includes('transition-colors')
    );
    expect(hasTransition).toBe(true);
  });

  it('should render all 4 links with correct hrefs', async () => {
    const { MobileNav } = await import('@/components/layout/MobileNav');

    render(<MobileNav />);

    const homeLink = screen.getByText(/dom/i).closest('a');
    const workLink = screen.getByText(/praca/i).closest('a');
    const shoppingLink = screen.getByText(/zakupy/i).closest('a');
    const activityLink = screen.getByText(/historia/i).closest('a');

    expect(homeLink?.getAttribute('href')).toBe('/home');
    expect(workLink?.getAttribute('href')).toBe('/work');
    expect(shoppingLink?.getAttribute('href')).toBe('/shopping');
    expect(activityLink?.getAttribute('href')).toBe('/activity');
  });
});
