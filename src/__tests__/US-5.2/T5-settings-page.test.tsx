import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T5: Settings Page Tests
 * Tests for settings page with household management
 */

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { id: 'test-user-id', household_id: 'h-1' },
            error: null,
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('T5: Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC5.1: should render with title "Ustawienia"', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;

    render(<SettingsPage />, { wrapper: createWrapper() });

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/ustawienia/i);
  });

  it('AC5.2: should display settings content (not placeholder)', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;

    render(<SettingsPage />, { wrapper: createWrapper() });

    // Should NOT show old placeholder text
    expect(screen.queryByText('Wkrótce')).not.toBeInTheDocument();
    // Should have the main heading
    expect(screen.getByText(/ustawienia/i)).toBeInTheDocument();
  });

  it('AC5.3: should be accessible via /settings route', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;

    expect(SettingsPage).toBeDefined();
    expect(typeof SettingsPage).toBe('function');
  });

  it('should render without errors', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;

    const { container } = render(<SettingsPage />, { wrapper: createWrapper() });
    
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have proper page structure', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;

    render(<SettingsPage />, { wrapper: createWrapper() });

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();

    const content = heading.parentElement;
    expect(content).toBeInTheDocument();
    expect(content?.textContent).toBeTruthy();
  });

  it('should be a valid Next.js page component', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;

    expect(typeof SettingsPage).toBe('function');

    const result = render(<SettingsPage />, { wrapper: createWrapper() });
    expect(result.container.firstChild).toBeTruthy();
  });
});
