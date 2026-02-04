import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ═══════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════

// Mock sonner Toaster
vi.mock('sonner', () => ({
  Toaster: ({ position }: any) => (
    <div data-testid="toaster" data-position={position}>
      Toaster
    </div>
  ),
}));

// Mock Providers component (layout uses it)
vi.mock('@/components/Providers', () => ({
  Providers: ({ children }: any) => <div data-testid="providers">{children}</div>,
}));

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('T8: Toaster in Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Import and render Toaster from sonner', () => {
    it('should render Toaster component in layout', async () => {
      const DashboardLayout = (await import('@/app/(dashboard)/layout')).default;

      render(
        <DashboardLayout>
          <div>Test content</div>
        </DashboardLayout>
      );

      const toaster = screen.getByTestId('toaster');
      expect(toaster).toBeInTheDocument();
    });

    it('should set position to "top-right"', async () => {
      const DashboardLayout = (await import('@/app/(dashboard)/layout')).default;

      render(
        <DashboardLayout>
          <div>Test content</div>
        </DashboardLayout>
      );

      const toaster = screen.getByTestId('toaster');
      expect(toaster).toHaveAttribute('data-position', 'top-right');
    });

    it('should still render children normally', async () => {
      const DashboardLayout = (await import('@/app/(dashboard)/layout')).default;

      render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });
});
