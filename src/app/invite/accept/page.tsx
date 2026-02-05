/**
 * Accept Invite Page
 * Page for accepting household invitations
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAcceptInvite } from '@/lib/hooks/useInvites';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const acceptInvite = useAcceptInvite();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (token && isAuthenticated && !acceptInvite.isSuccess) {
      acceptInvite.mutate({ token });
    }
  }, [token, isAuthenticated, acceptInvite.isSuccess, acceptInvite.mutate]);

  useEffect(() => {
    if (acceptInvite.isSuccess) {
      const timer = setTimeout(() => {
        router.push('/home');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [acceptInvite.isSuccess, router]);

  // Render states in order of priority
  if (acceptInvite.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-green-600 mb-4">✓ Invite Accepted!</h1>
          <p className="text-gray-600">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  if (acceptInvite.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
          <p className="text-red-600 mb-6">
            {acceptInvite.error instanceof Error
              ? acceptInvite.error.message
              : 'Invalid token'}
          </p>
          <Button onClick={() => router.push('/home')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (acceptInvite.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
          <p className="text-gray-600">Processing invite...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
          <p className="text-red-600 mb-6">Invalid token</p>
          <Button onClick={() => router.push('/home')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
          <p className="text-gray-600">Please sign in to continue...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    const returnUrl = encodeURIComponent(`/invite/accept?token=${token}`);
    router.push(`/login?returnUrl=${returnUrl}`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
          <p className="text-gray-600">Please sign in to continue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
        <p className="text-gray-600">Processing...</p>
      </div>
    </div>
  );
}

function AcceptInvitePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInvitePage />
    </Suspense>
  );
}

export default AcceptInvitePageWrapper;
