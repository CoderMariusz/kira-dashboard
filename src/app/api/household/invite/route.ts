/**
 * POST /api/household/invite
 * Create a new household invite
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendInviteEmail } from '@/lib/email/send-invite';
import { badRequest, success, unauthorized } from '@/lib/utils/api-errors';
import { isValidEmail } from '@/lib/utils/validation';
import { INVITE_EXPIRY_DAYS } from '@/lib/constants/invite';

export async function POST(request: NextRequest) {
  // Parse and validate request body
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { email } = body;

  if (!email || typeof email !== 'string') {
    return badRequest('Email is required');
  }

  if (!isValidEmail(email)) {
    return badRequest('Invalid email format');
  }

  // Authenticate user
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    return unauthorized();
  }

  // Get user's profile with household
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, household_id, display_name')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return badRequest('Profile not found');
  }

  if (!profile.household_id) {
    return badRequest('User has no household');
  }

  // Check for existing pending invite for this email and household
  const { data: existingInvites } = await supabase
    .from('household_invites')
    .select('*')
    .eq('email', email);

  if (existingInvites && existingInvites.length > 0) {
    const pendingForThisHousehold = existingInvites.some(
      inv => inv.household_id === profile.household_id && inv.status === 'pending'
    );
    if (pendingForThisHousehold) {
      return badRequest('Pending invite already exists for this email');
    }
  }

  // Create invite record
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const { data: invite, error: insertError } = await supabase
    .from('household_invites')
    .insert({
      household_id: profile.household_id,
      email,
      invited_by: userData.user.id,
      status: 'pending',
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError || !invite) {
    return badRequest('Failed to create invite: ' + (insertError?.message || 'Unknown error'));
  }

  // Attempt to send email (graceful fallback if it fails)
  try {
    await sendInviteEmail({
      to: email,
      inviterName: profile.display_name || 'Someone',
      token,
    });
  } catch {
    // Email sending failed but invite is created - still return success
    // Client will show "Copy Link" option
  }

  return success({ invite });
}
