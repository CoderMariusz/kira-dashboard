/**
 * InviteForm Component
 * Form to send invites to new household members
 */

'use client';

import { useState } from 'react';
import { useSendInvite } from '@/lib/hooks/useInvites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function InviteForm() {
  const [email, setEmail] = useState('');
  const [showCopyLink, setShowCopyLink] = useState(false);
  const [lastInviteToken, setLastInviteToken] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const sendInvite = useSendInvite();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setShowCopyLink(false);

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }

    sendInvite.mutate(
      { email },
      {
        onSuccess: (data) => {
          setEmail('');
          if (data?.token) {
            setLastInviteToken(data.token);
            setShowCopyLink(true);
          }
        },
      }
    );
  };

  const handleCopyLink = () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const link = `${appUrl}/invite/accept?token=${lastInviteToken}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Invite</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            disabled={sendInvite.isPending}
          />
          {emailError && (
            <p className="text-sm text-red-500 mt-1">{emailError}</p>
          )}
        </div>
        
        <Button
          type="submit"
          disabled={sendInvite.isPending}
          aria-label="send invite"
        >
          {sendInvite.isPending ? 'Sending...' : 'Send'}
        </Button>
      </form>

      {showCopyLink && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            Invite sent! You can also share this link:
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
          >
            Copy Link
          </Button>
        </div>
      )}
    </div>
  );
}
