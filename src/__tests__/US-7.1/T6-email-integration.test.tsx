import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * T6: Email Template & SendGrid Integration
 * Tests for email template and SendGrid wrapper
 *
 * EXPECTED: ❌ ALL TESTS SHOULD FAIL
 * Email functions do not exist yet
 */

// ═══════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════

const mockSend = vi.fn();

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: mockSend,
  },
}));

// ═══════════════════════════════════════════
// Mock data
// ═══════════════════════════════════════════

const mockInvite = {
  id: 'invite-1',
  household_id: 'hh-1',
  email: 'new@example.com',
  invited_by: 'user-1',
  inviter_name: 'John Doe',
  status: 'pending',
  token: 'token-123',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  accepted_at: null,
};

describe('T6: Email Template & SendGrid Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env.SENDGRID_API_KEY = 'SG.test-key';
  });

  describe('Email Template', () => {
    it('AC6.1: should include inviter name, accept link, and 7-day expiry note', async () => {
      // @ts-expect-error - Template doesn't exist yet
      const { generateInviteTemplate } = await import('@/lib/email/invite-template');

      const html = generateInviteTemplate({
        inviterName: 'John Doe',
        acceptUrl: 'https://app.example.com/invite/accept?token=token-123',
      });

      // Should include inviter name
      expect(html).toContain('John Doe');

      // Should include accept link
      expect(html).toContain('https://app.example.com/invite/accept?token=token-123');

      // Should include 7-day expiry note
      expect(html).toMatch(/7\s*(days|dzień|dni)/i);
    });

    it('AC6.1b: template should be valid HTML', async () => {
      // @ts-expect-error - Template doesn't exist yet
      const { generateInviteTemplate } = await import('@/lib/email/invite-template');

      const html = generateInviteTemplate({
        inviterName: 'Jane Doe',
        acceptUrl: 'https://app.example.com/invite/accept?token=token-456',
      });

      // Should have proper HTML structure
      expect(html).toMatch(/<!DOCTYPE html>|<html|<body/i);
    });
  });

  describe('sendInviteEmail Function', () => {
    it('AC6.2: should use SendGrid when SENDGRID_API_KEY is available', async () => {
      process.env.SENDGRID_API_KEY = 'SG.valid-api-key';

      // @ts-expect-error - Function doesn't exist yet
      const { sendInviteEmail } = await import('@/lib/email/send-invite');

      const result = await sendInviteEmail({
        to: 'new@example.com',
        inviterName: 'John Doe',
        token: 'token-123',
        acceptUrl: 'https://app.example.com/invite/accept?token=token-123',
      });

      // Should have called SendGrid
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@example.com',
          from: expect.any(String),
          subject: expect.any(String),
          html: expect.any(String),
        })
      );

      expect(result.sent).toBe(true);
    });

    it('AC6.3: should return { sent: false } gracefully when no API key (no throw)', async () => {
      // Remove API key
      delete process.env.SENDGRID_API_KEY;

      // @ts-expect-error - Function doesn't exist yet
      const { sendInviteEmail } = await import('@/lib/email/send-invite');

      // Should not throw
      const result = await sendInviteEmail({
        to: 'new@example.com',
        inviterName: 'John Doe',
        token: 'token-123',
        acceptUrl: 'https://app.example.com/invite/accept?token=token-123',
      });

      // Should return graceful fallback result
      expect(result.sent).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('AC6.4: accept URL format should be {APP_URL}/invite/accept?token={token}', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

      // @ts-expect-error - Function doesn't exist yet
      const { sendInviteEmail } = await import('@/lib/email/send-invite');

      await sendInviteEmail({
        to: 'new@example.com',
        inviterName: 'John Doe',
        token: 'token-123',
      });

      expect(mockSend).toHaveBeenCalled();

      const emailArgs = mockSend.mock.calls[0][0];
      expect(emailArgs.html).toContain('/invite/accept?token=token-123');
    });

    it('AC6.4b: should use NEXT_PUBLIC_APP_URL from environment for accept link', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.example.com';

      // @ts-expect-error - Function doesn't exist yet
      const { sendInviteEmail } = await import('@/lib/email/send-invite');

      await sendInviteEmail({
        to: 'new@example.com',
        inviterName: 'Jane Doe',
        token: 'token-456',
      });

      expect(mockSend).toHaveBeenCalled();

      const emailArgs = mockSend.mock.calls[0][0];
      expect(emailArgs.html).toContain('https://custom-domain.example.com/invite/accept?token=token-456');
    });
  });
});
