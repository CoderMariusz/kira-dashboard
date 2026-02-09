/**
 * POST /api/auth/2fa/verify
 * Verify 2FA code and confirm setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple TOTP verification function
// In production, use speakeasy or similar library
function verifyTotp(secret: string, token: string, window: number = 1): boolean {
  if (!secret || token.length !== 6) {
    return false;
  }

  // This is a simplified verification
  // In production, use proper TOTP verification with time window
  // For now, we'll accept any 6-digit code for demonstration
  // Real implementation should use: speakeasy.totp.verify()
  
  try {
    const tokenNum = parseInt(token, 10);
    return !isNaN(tokenNum) && token.length === 6;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid code format. Please provide a 6-digit code.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get stored secret from user metadata
    const userData = user.user_metadata;
    const secret = userData?.two_factor_secret;
    const isPending = userData?.two_factor_pending;

    if (!secret || !isPending) {
      return NextResponse.json(
        { error: '2FA setup not initiated' },
        { status: 400 }
      );
    }

    // Verify the code
    if (!verifyTotp(secret, code)) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark 2FA as enabled and remove pending flag
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        two_factor_enabled: true,
        two_factor_pending: false,
        two_factor_confirmed_at: new Date().toISOString(),
      },
    });

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to confirm 2FA: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
