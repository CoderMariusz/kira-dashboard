'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TwoFactorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isEnabled?: boolean;
}

type SetupStep = 'select' | 'setup' | 'verify' | 'backup';

export function TwoFactorAuthModal({
  isOpen,
  onClose,
  onSuccess,
  isEnabled = false,
}: TwoFactorAuthModalProps) {
  const [step, setStep] = useState<SetupStep>('select');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backupCodes] = useState<string[]>([
    'XXXX-XXXX-XXXX',
    'YYYY-YYYY-YYYY',
    'ZZZZ-ZZZZ-ZZZZ',
  ]);

  const handleSetupStart = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to setup 2FA');
        return;
      }

      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setStep('setup');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid verification code');
        return;
      }

      setSuccess('2FA enabled successfully!');
      setStep('backup');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'DELETE',
      });

      if (!response.ok) {
        setError('Failed to disable 2FA');
        return;
      }

      setSuccess('2FA has been disabled');
      setStep('select');
      setVerificationCode('');

      if (onSuccess) {
        setTimeout(() => {
          onClose();
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setQrCodeUrl('');
    setSecret('');
    setVerificationCode('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>🔐 Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your account
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Action */}
        {step === 'select' && (
          <div className="space-y-4">
            {isEnabled ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700 font-semibold mb-4">✓ 2FA is enabled</p>
                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={loading}
                  className="w-full"
                >
                  Disable 2FA
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700 mb-4">
                    Protect your account with two-factor authentication. You'll need your phone to sign in.
                  </p>
                </div>
                <Button
                  onClick={handleSetupStart}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Setting up...' : 'Enable 2FA'}
                </Button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Scan QR Code */}
        {step === 'setup' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
              </p>
            </div>

            {qrCodeUrl && (
              <div className="flex justify-center">
                <div className="bg-white border-2 border-gray-300 p-4 rounded-lg">
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code for 2FA"
                    width={200}
                    height={200}
                    unoptimized
                  />
                </div>
              </div>
            )}

            {secret && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Or enter this code manually:</p>
                <div className="bg-gray-100 p-3 rounded-md font-mono text-center text-sm">
                  {secret}
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-700">
                ⚠️ Save the secret code above in a safe place. You'll need it to recover your account if you lose access to your authenticator.
              </p>
            </div>

            <Button
              onClick={() => setStep('verify')}
              disabled={loading}
              className="w-full"
            >
              Next: Verify Code
            </Button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Verify Code */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                maxLength={6}
                disabled={loading}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('setup')}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Backup Codes */}
        {step === 'backup' && (
          <div className="space-y-4">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {success}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-700 font-semibold mb-3">
                📋 Save Your Backup Codes
              </p>
              <p className="text-sm text-amber-700 mb-3">
                If you lose access to your authenticator, use these codes to regain access:
              </p>
              <div className="bg-white p-3 rounded font-mono text-sm space-y-1 mb-3">
                {backupCodes.map((code, idx) => (
                  <div key={idx}>{code}</div>
                ))}
              </div>
              <p className="text-xs text-amber-600">
                Keep these codes in a secure location
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
