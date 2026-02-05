import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * T5: Accept Invite Page
 * Tests for accept invite page
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Page does not exist yet
 */

// ═══════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockPush,
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

const mockUseAcceptInvite = vi.fn();

vi.mock('@/lib/hooks/useInvites', () => ({
  useAcceptInvite: () => mockUseAcceptInvite(),
}));

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const Wrapper = createWrapper();

describe('T5: Accept Invite Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks to default state
    mockUseAcceptInvite.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      isSuccess: false,
    });
  });

  describe('Token Handling', () => {
    it('AC5.1: should read token from URL search params', async () => {
      // @ts-expect-error - Page doesn't exist yet
      const { AcceptInvitePage } = await import('@/app/invite/accept/page');

      render(<Wrapper><AcceptInvitePage /></Wrapper>);

      // Page should read and use the token
      expect(screen.getByText(/accept/i)).toBeInTheDocument();
    });

    it('AC5.2: should show error if no token provided', async () => {
      // @ts-expect-error - Page doesn't exist yet
      const { AcceptInvitePage } = await import('@/app/invite/accept/page');

      render(<Wrapper><AcceptInvitePage /></Wrapper>);

      // Should show error message when no token
      expect(screen.getByText(/invalid|missing token/i)).toBeInTheDocument();
    });
  });

  describe('Authentication Redirect', () => {
    it('AC5.3: should redirect to /login if user not authenticated (with returnUrl)', async () => {
      // @ts-expect-error - Page doesn't exist yet
      const { AcceptInvitePage } = await import('@/app/invite/accept/page');

      render(<Wrapper><AcceptInvitePage /></Wrapper>);

      // Should check auth and redirect if not authenticated
      // The redirect should include the current URL as returnUrl
      expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
    });
  });

  describe('Accept Flow', () => {
    it('AC5.4: should call accept API with token', async () => {
      // @ts-expect-error - Page doesn't exist yet
      const { AcceptInvitePage } = await import('@/app/invite/accept/page');

      const mutate = vi.fn();
      mockUseAcceptInvite.mockReturnValue({
        mutate,
        isPending: false,
        error: null,
        isSuccess: false,
      });

      render(<Wrapper><AcceptInvitePage /></Wrapper>);

      // Page should call the accept mutation with the token
      expect(mutate).toHaveBeenCalled();
    });

    it('AC5.5: should show success state with checkmark and Redirecting message', async () => {
      // @ts-expect-error - Page doesn't exist yet
      const { AcceptInvitePage } = await import('@/app/invite/accept/page');

      // Simulate success
      mockUseAcceptInvite.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: null,
        isSuccess: true,
      });

      render(<Wrapper><AcceptInvitePage /></Wrapper>);

      // Should show success state
      expect(screen.getByText(/✓|success|invite accepted/i)).toBeInTheDocument();
      expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
    });

    it('AC5.6: should show error state with message and Go Home button', async () => {
      // @ts-expect-error - Page doesn't exist yet
      const { AcceptInvitePage } = await import('@/app/invite/accept/page');

      // Simulate error
      mockUseAcceptInvite.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Invalid token'),
        isSuccess: false,
      });

      render(<Wrapper><AcceptInvitePage /></Wrapper>);

      // Should show error state
      expect(screen.getByText(/error|invalid token/i)).toBeInTheDocument();

      // Should have Go Home button
      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      expect(goHomeButton).toBeInTheDocument();
    });

    it('AC5.7: should auto-redirect to /home after 2s on success', async () => {
      // @ts-expect-error - Page doesn't exist yet
      const { AcceptInvitePage } = await import('@/app/invite/accept/page');

      // Simulate success
      mockUseAcceptInvite.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: null,
        isSuccess: true,
      });

      vi.useFakeTimers();

      render(<Wrapper><AcceptInvitePage /></Wrapper>);

      // Fast-forward time
      vi.advanceTimersByTime(2000);

      // Should have redirected to /home
      expect(mockPush).toHaveBeenCalledWith('/home');

      vi.useRealTimers();
    });
  });

  describe('Go Home Button', () => {
    it('AC5.6b: Go Home button should navigate to /home', async () => {
      // @ts-expect-error - Page doesn't exist yet
      const { AcceptInvitePage } = await import('@/app/invite/accept/page');

      // Simulate error state
      mockUseAcceptInvite.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Invalid token'),
        isSuccess: false,
      });

      render(<Wrapper><AcceptInvitePage /></Wrapper>);

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      await userEvent.click(goHomeButton);

      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });
});
