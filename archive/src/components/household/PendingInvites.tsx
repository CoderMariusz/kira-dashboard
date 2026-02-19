/**
 * PendingInvites Component
 * Displays list of pending invites with revoke functionality
 */

'use client';

import { useInvites, useRevokeInvite } from '@/lib/hooks/useInvites';
import { Button } from '@/components/ui/button';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

function formatExpiry(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires in 1 day';
  return `Expires in ${diffDays} days`;
}

export function PendingInvites() {
  const { data: invites, isLoading, error } = useInvites();
  const revokeInvite = useRevokeInvite();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pending</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pending</h3>
        <p className="text-red-500">Failed to load invites</p>
      </div>
    );
  }

  if (!invites || invites.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pending</h3>
        <p className="text-gray-500">No pending invites</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending</h3>
      
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{invite.email}</p>
              <p className="text-sm text-gray-500">
                {formatTimeAgo(invite.created_at)} • {formatExpiry(invite.expires_at)}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => revokeInvite.mutate({ inviteId: invite.id })}
              disabled={revokeInvite.isPending}
            >
              Revoke
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
