/**
 * Household Settings Page
 * Manage household members and invites
 */

'use client';

import { HouseholdMembers } from '@/components/household/HouseholdMembers';
import { InviteForm } from '@/components/household/InviteForm';
import { PendingInvites } from '@/components/household/PendingInvites';

export function HouseholdSettings() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">Household Settings</h1>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <section className="bg-white p-6 rounded-lg shadow">
          <HouseholdMembers />
        </section>
        
        <section className="bg-white p-6 rounded-lg shadow">
          <InviteForm />
        </section>
        
        <section className="bg-white p-6 rounded-lg shadow">
          <PendingInvites />
        </section>
      </div>
    </div>
  );
}

export default HouseholdSettings;
