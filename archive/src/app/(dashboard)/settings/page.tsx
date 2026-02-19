/**
 * Settings Page
 * Kira Dashboard — Household management, invites, member list
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HouseholdMembers } from '@/components/household/HouseholdMembers';
import { PendingInvites } from '@/components/household/PendingInvites';
import { InviteForm } from '@/components/household/InviteForm';
import { useHousehold } from '@/lib/hooks/useHousehold';

export default function SettingsPage() {
  const { data: household, isLoading, error } = useHousehold();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">⚙️ Ustawienia</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Ustawienia</h1>

      {/* Household Info */}
      <Card>
        <CardHeader>
          <CardTitle>🏠 Gospodarstwo domowe</CardTitle>
          <CardDescription>
            {household
              ? `Zarządzaj członkami ${household.name || 'Twojego gospodarstwa'}`
              : 'Skonfiguruj swoje gospodarstwo domowe'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-red-500">Błąd ładowania danych. Spróbuj odświeżyć stronę.</p>
          ) : !household ? (
            <p className="text-muted-foreground">
              Nie masz jeszcze skonfigurowanego gospodarstwa domowego.
            </p>
          ) : (
            <div className="space-y-8">
              {/* Members List */}
              <HouseholdMembers />

              {/* Invite Form */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">📧 Zaproś członka</h3>
                <InviteForm />
              </div>

              {/* Pending Invites */}
              <div className="border-t pt-6">
                <PendingInvites />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
