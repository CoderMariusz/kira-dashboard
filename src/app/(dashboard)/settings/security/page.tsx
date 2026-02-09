/**
 * Security Settings Page
 * Displays security-related settings including active sessions
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActiveSessions } from '@/components/security/ActiveSessions';

export default function SecuritySettingsPage() {
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
                  Protect your account with a second factor
                </p>
              </div>
              <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Enable 2FA
              </button>
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
              <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Change Password
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
