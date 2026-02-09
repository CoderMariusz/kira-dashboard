/**
 * Security Settings Page
 * Displays security-related settings including active sessions
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActiveSessions } from '@/components/security/ActiveSessions';
import { ChangePasswordModal } from '@/components/security/ChangePasswordModal';
import { TwoFactorAuthModal } from '@/components/security/TwoFactorAuthModal';

export default function SecuritySettingsPage() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false); // In production, fetch from API

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔒 Security Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account security and view active sessions
        </p>
      </div>

      {/* Active Sessions Section */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Active Sessions</CardTitle>
          <CardDescription>
            View all devices and locations where you're currently logged in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveSessions />
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle>🔐 Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  {is2FAEnabled
                    ? 'Your account is protected with two-factor authentication'
                    : 'Protect your account with a second factor'}
                </p>
              </div>
              <Button
                onClick={() => setIs2FAModalOpen(true)}
                variant={is2FAEnabled ? 'destructive' : 'default'}
              >
                {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>🔑 Password</CardTitle>
          <CardDescription>Change your password regularly to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Last changed on September 15, 2024</p>
              <Button
                onClick={() => setIsPasswordModalOpen(true)}
                className="mt-4"
              >
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          // Refresh or show success message
        }}
      />

      <TwoFactorAuthModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        onSuccess={() => {
          setIs2FAEnabled(!is2FAEnabled);
        }}
        isEnabled={is2FAEnabled}
      />
    </div>
  );
}
