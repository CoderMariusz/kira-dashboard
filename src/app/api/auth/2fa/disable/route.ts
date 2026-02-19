/**
 * DELETE /api/auth/2fa/disable
 * Disable 2FA for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
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

    // Clear 2FA settings
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_pending: false,
        two_factor_confirmed_at: null,
      },
    });

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to disable 2FA: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
