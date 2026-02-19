/**
 * PUT /api/auth/password
 * Change user password with validation
 * Requires: currentPassword, newPassword, confirmPassword
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validatePasswordChange } from '@/lib/utils/password-validation';

export async function PUT(request: NextRequest) {
  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate password strength and requirements
    const validation = validatePasswordChange(
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Password validation failed',
          errors: validation.errors,
          strength: validation.strength,
        },
        { status: 400 }
      );
    }

    // Get current user
    const supabase = await createClient();
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

    // Update password in Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update password: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
