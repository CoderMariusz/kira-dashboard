/**
 * POST /api/auth/2fa/setup
 * Initialize 2FA setup - generates QR code and secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple TOTP secret generator
function generateSecret(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

// Generate QR code data URI (using a simple format)
function generateQRCodeDataUri(secret: string, email: string): string {
  const encodedSecret = encodeURIComponent(secret);
  const encodedEmail = encodeURIComponent(email);
  // Using Google Authenticator format
  const otpauthUrl = `otpauth://totp/Kira%20Dashboard:${encodedEmail}?secret=${encodedSecret}&issuer=Kira%20Dashboard`;
  
  // Return QR code URL using external service (qrserver.com)
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauthUrl)}`;
}

export async function POST(request: NextRequest) {
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

    // Generate TOTP secret
    const secret = generateSecret();
    const qrCodeUrl = generateQRCodeDataUri(secret, user.email || '');

    // Store temporary secret in user metadata (not yet confirmed)
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        two_factor_secret: secret,
        two_factor_pending: true,
        two_factor_setup_timestamp: new Date().toISOString(),
      },
    });

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to initialize 2FA setup: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      secret,
      qrCodeUrl,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
