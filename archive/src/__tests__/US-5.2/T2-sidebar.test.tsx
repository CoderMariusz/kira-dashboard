import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * T2: Sidebar Component Tests
 * Desktop sidebar navigation (>1024px)
 * 
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Component does not exist yet
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

describe('T2: Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/home');
  });

  it('AC2.1: should render sidebar fixed on left side', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toBeInTheDocument();
    
    // Should have fixed positioning
    expect(sidebar.className).toMatch(/fixed/);
  });

  it('AC2.2: should be hidden on mobile and tablet, visible on desktop (hidden lg:flex)', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const sidebar = screen.getByRole('navigation');
    
    // Should have hidden class (hidden by default)
    expect(sidebar.className).toMatch(/hidden/);
    
    // Should have lg:flex class (visible on desktop)
    expect(sidebar.className).toMatch(/lg:flex/);
  });

  it('AC2.3: should have width w-64 (256px)', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const sidebar = screen.getByRole('navigation');
    expect(sidebar.className).toMatch(/w-64/);
  });

  it('AC2.4: should render 5 navigation items including Settings', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    expect(screen.getByText(/dom/i)).toBeInTheDocument();
    expect(screen.getByText(/praca/i)).toBeInTheDocument();
    expect(screen.getByText(/zakupy/i)).toBeInTheDocument();
    expect(screen.getByText(/historia/i)).toBeInTheDocument();
    expect(screen.getByText(/ustawienia/i)).toBeInTheDocument();
  });

  it('AC2.5: should display "Kira Dashboard" logo/title in header', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    expect(screen.getByText(/kira dashboard/i)).toBeInTheDocument();
  });

  it('AC2.6: should highlight active route with bg-blue-50 and text-blue-600', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/home');
    render(<Sidebar />);

    const homeLink = screen.getByText(/dom/i).closest('a');
    
    // Active route should have blue background and text
    expect(homeLink?.className).toMatch(/bg-blue-50/);
    expect(homeLink?.className).toMatch(/text-blue-600/);
  });

  it('AC2.7: should show inactive routes with text-gray-700 and hover:bg-gray-50', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/home');
    render(<Sidebar />);

    const workLink = screen.getByText(/praca/i).closest('a');
    
    // Inactive routes should have gray text
    expect(workLink?.className).toMatch(/text-gray-700/);
    
    // Should have hover effect
    expect(workLink?.className).toMatch(/hover:bg-gray-50/);
  });

  it('should render all navigation items with correct hrefs', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const homeLink = screen.getByText(/dom/i).closest('a');
    const workLink = screen.getByText(/praca/i).closest('a');
    const shoppingLink = screen.getByText(/zakupy/i).closest('a');
    const activityLink = screen.getByText(/historia/i).closest('a');
    const settingsLink = screen.getByText(/ustawienia/i).closest('a');

    expect(homeLink?.getAttribute('href')).toBe('/home');
    expect(workLink?.getAttribute('href')).toBe('/work');
    expect(shoppingLink?.getAttribute('href')).toBe('/shopping');
    expect(activityLink?.getAttribute('href')).toBe('/activity');
    expect(settingsLink?.getAttribute('href')).toBe('/settings');
  });

  it('should display icons from lucide-react for each nav item', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    render(<Sidebar />);

    const links = screen.getAllByRole('link').filter(link => 
      link.getAttribute('href')?.startsWith('/')
    );

    // Each nav link should contain an svg icon
    links.forEach(link => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should update active state when pathname changes', async () => {
    const { Sidebar } = await import('@/components/layout/Sidebar');

    mockPathname.mockReturnValue('/work');
    const { rerender } = render(<Sidebar />);

    const workLink = screen.getByText(/praca/i).closest('a');
    expect(workLink?.className).toMatch(/bg-blue-50/);
    expect(workLink?.className).toMatch(/text-blue-600/);

    // Change pathname
    mockPathname.mockReturnValue('/settings');
    rerender(<Sidebar />);

    const settingsLink = screen.getByText(/ustawienia/i).closest('a');
    expect(settingsLink?.className).toMatch(/bg-blue-50/);
    expect(settingsLink?.className).toMatch(/text-blue-600/);
  });
});
