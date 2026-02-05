/**
 * useInvites Hook
 * Kira Dashboard - Manage household invites with React Query
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { HouseholdInvite } from '@/lib/types/database';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════
// FETCH: Pending invites for current household
// ═══════════════════════════════════════════════════════════

async function fetchInvites(): Promise<HouseholdInvite[]> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get user's profile to find household
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single() as { data: { household_id: string | null } | null; error: Error | null };

  if (profileError) throw profileError;
  if (!profile?.household_id) return [];

  // Fetch pending invites for this household
  const { data, error } = await supabase
    .from('household_invites')
    .select('*')
    .eq('household_id', profile.household_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as HouseholdInvite[];
}

// ═══════════════════════════════════════════════════════════
// MUTATION: Send invite
// ═══════════════════════════════════════════════════════════

interface SendInviteParams {
  email: string;
}

async function sendInvite({ email }: SendInviteParams): Promise<HouseholdInvite> {
  const response = await fetch('/api/household/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send invite');
  }

  const json = await response.json();
  return json.invite as HouseholdInvite;
}

// ═══════════════════════════════════════════════════════════
// MUTATION: Revoke invite
// ═══════════════════════════════════════════════════════════

interface RevokeInviteParams {
  inviteId: string;
}

async function revokeInvite({ inviteId }: RevokeInviteParams): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('household_invites')
    .update({ status: 'rejected' })
    .eq('id', inviteId);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════
// MUTATION: Accept invite
// ═══════════════════════════════════════════════════════════

interface AcceptInviteParams {
  token: string;
}

async function acceptInvite({ token }: AcceptInviteParams): Promise<void> {
  const response = await fetch('/api/household/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to accept invite');
  }
}

// ═══════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════

/**
 * Get pending invites for current household
 */
export function useInvites() {
  return useQuery({
    queryKey: ['invites'],
    queryFn: fetchInvites,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Mutation: Send invite
 * Shows toast on success/error
 */
export function useSendInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: sendInvite,
    onSuccess: () => {
      toast({ title: 'Invite sent successfully!' });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Failed to send invite', variant: 'destructive' });
    },
  });
}

/**
 * Mutation: Revoke invite
 * Invalidates invites query after revoke
 */
export function useRevokeInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: revokeInvite,
    onSuccess: () => {
      toast({ title: 'Invite revoked' });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: () => {
      toast({ title: 'Failed to revoke invite', variant: 'destructive' });
    },
  });
}

/**
 * Mutation: Accept invite
 */
export function useAcceptInvite() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      toast({ title: 'Invite accepted!' });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Failed to accept invite', variant: 'destructive' });
    },
  });
}
