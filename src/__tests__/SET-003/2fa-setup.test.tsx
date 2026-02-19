/**
 * Test: SET-003 - Two-Factor Authentication Setup
 * Tests 2FA functionality and setup flow
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorAuthModal } from '@/components/security/TwoFactorAuthModal';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('SET-003: Two-Factor Authentication Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  test('should display initial selection state', () => {
    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        isEnabled={false}
      />
    );

    expect(screen.getByText('🔐 Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
  });

  test('should show disable option when 2FA is enabled', () => {
    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        isEnabled={true}
      />
    );

    const disableButton = screen.getByRole('button', { name: /Disable 2FA/i });
    expect(disableButton).toBeInTheDocument();
  });

  test('should initialize 2FA setup when enable button clicked', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        secret: 'TESTSECRETSAMPLE123',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
        message: 'Scan the QR code with your authenticator app',
      }),
    });

    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        isEnabled={false}
      />
    );

    const enableButton = screen.getByRole('button', { name: /Enable 2FA/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/2fa/setup', {
        method: 'POST',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Scan this QR code with your authenticator app/i)
      ).toBeInTheDocument();
    });
  });

  test('should display manual secret entry option', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        secret: 'MANUALSECRETSAMPLE123',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
      }),
    });

    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        isEnabled={false}
      />
    );

    const enableButton = screen.getByRole('button', { name: /Enable 2FA/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(screen.getByText(/Or enter this code manually:/i)).toBeInTheDocument();
      expect(screen.getByText('MANUALSECRETSAMPLE123')).toBeInTheDocument();
    });
  });

  test('should validate verification code length', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          secret: 'TESTSECRET',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        isEnabled={false}
      />
    );

    const enableButton = screen.getByRole('button', { name: /Enable 2FA/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Next: Verify Code/i)
      ).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /Next: Verify Code/i });
    await user.click(nextButton);

    await waitFor(() => {
      const verifyButton = screen.getByRole('button', { name: /^Verify$/i });
      expect(verifyButton).toBeDisabled();
    });
  });

  test('should handle verification code input', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          secret: 'TESTSECRET',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        isEnabled={false}
      />
    );

    const enableButton = screen.getByRole('button', { name: /Enable 2FA/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(screen.getByText(/Next: Verify Code/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /Next: Verify Code/i });
    await user.click(nextButton);

    const codeInput = screen.getByPlaceholderText('000000');
    await user.type(codeInput, '123456');

    await waitFor(() => {
      const verifyButton = screen.getByRole('button', { name: /^Verify$/i });
      expect(verifyButton).not.toBeDisabled();
    });
  });

  test('should display backup codes after successful verification', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          secret: 'TESTSECRET',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: '2FA enabled successfully!',
        }),
      });

    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        isEnabled={false}
      />
    );

    // Start setup
    const enableButton = screen.getByRole('button', { name: /Enable 2FA/i });
    await user.click(enableButton);

    // Move to verification
    await waitFor(() => {
      expect(screen.getByText(/Next: Verify Code/i)).toBeInTheDocument();
    });
    
    const nextButton = screen.getByRole('button', { name: /Next: Verify Code/i });
    await user.click(nextButton);

    // Enter code and verify
    const codeInput = screen.getByPlaceholderText('000000');
    await user.type(codeInput, '123456');

    const verifyButton = screen.getByRole('button', { name: /^Verify$/i });
    await user.click(verifyButton);

    // Check for backup codes display
    await waitFor(() => {
      expect(screen.getByText(/Save Your Backup Codes/i)).toBeInTheDocument();
      expect(screen.getByText(/XXXX-XXXX-XXXX/)).toBeInTheDocument();
    });
  });

  test('should handle 2FA disable action', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: '2FA has been disabled',
      }),
    });

    window.confirm = jest.fn(() => true);

    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={mockOnSuccess}
        isEnabled={true}
      />
    );

    const disableButton = screen.getByRole('button', { name: /Disable 2FA/i });
    await user.click(disableButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('disable 2FA')
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/2fa/disable', {
        method: 'DELETE',
      });
    });
  });

  test('should handle API errors gracefully', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Failed to setup 2FA',
      }),
    });

    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={jest.fn()}
        isEnabled={false}
      />
    );

    const enableButton = screen.getByRole('button', { name: /Enable 2FA/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to setup 2FA/i)).toBeInTheDocument();
    });
  });

  test('should call onSuccess callback when 2FA is enabled', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = jest.fn();
    const mockOnClose = jest.fn();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          secret: 'TESTSECRET',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: '2FA enabled successfully!',
        }),
      });

    render(
      <TwoFactorAuthModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        isEnabled={false}
      />
    );

    // Complete the flow
    const enableButton = screen.getByRole('button', { name: /Enable 2FA/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(screen.getByText(/Next: Verify Code/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /Next: Verify Code/i });
    await user.click(nextButton);

    const codeInput = screen.getByPlaceholderText('000000');
    await user.type(codeInput, '123456');

    const verifyButton = screen.getByRole('button', { name: /^Verify$/i });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
