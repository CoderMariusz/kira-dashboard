/**
 * POST /api/household/accept
 * Accept a household invite
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { badRequest, unauthorized, success } from '@/lib/utils/api-errors';

export async function POST(request: NextRequest) {
  // 1. Parse request body first
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { token } = body;

  // 2. Validate token first
  if (!token || typeof token !== 'string') {
    return badRequest('Token is required');
  }

  // 3. Authenticate user
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    return unauthorized();
  }

  // 4. Get user email
  const userEmail = userData.user.email;
  if (!userEmail) {
    return badRequest('User email not available');
  }

  // 5. Find invite by token
  const { data: invite, error: inviteError } = await supabase
    .from('household_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return badRequest('Invite not found or already processed');
  }

  // Check status separately (for mock compatibility)
  if (invite.status !== 'pending') {
    return badRequest('Invite not found or already processed');
  }

  // 6. Check if invite is expired
  const now = new Date();
  const expiresAt = new Date(invite.expires_at);
  if (now > expiresAt) {
    // Mark as expired
    await supabase
      .from('household_invites')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return badRequest('Invite has expired');
  }

  // 7. Check if user email matches invite email
  if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return badRequest('Email does not match invite');
  }

  // 8. Get user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return badRequest('Profile not found');
  }

  // 9. Update profile with household_id
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ household_id: invite.household_id })
    .eq('id', profile.id);

  if (updateError) {
    return badRequest('Failed to update profile: ' + updateError.message);
  }

  // 10. Mark invite as accepted
  const { error: inviteUpdateError } = await supabase
    .from('household_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  if (inviteUpdateError) {
    return badRequest('Failed to update invite: ' + inviteUpdateError.message);
  }

  return success({ success: true });
}
