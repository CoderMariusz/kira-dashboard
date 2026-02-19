import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

/**
 * User profile with household information
 */
export interface UserProfile {
  id: string;
  household_id: string;
  display_name: string;
}

/**
 * Authentication result
 */
export type AuthResult = 
  | { success: true; profile: UserProfile }
  | { success: false; response: NextResponse };

// ══════════════════════════════════════════════════════════
// AUTHENTICATION HELPER
// ══════════════════════════════════════════════════════════

/**
 * Authenticates request and fetches user profile with household info.
 * 
 * Performs both authentication check and profile lookup in a single reusable
 * function to eliminate duplication across API routes.
 * 
 * @returns AuthResult - Either success with profile or error response
 * 
 * @example
 * ```ts
 * const auth = await authenticateAndGetProfile();
 * if (!auth.success) return auth.response;
 * 
 * const { profile } = auth;
 * console.log(profile.household_id);
 * ```
 */
export async function authenticateAndGetProfile(): Promise<AuthResult> {
  const supabase = await createClient();
  
  // 1. Authenticate user
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }

  // 2. Fetch profile with household_id
  // Note: profiles.id IS the auth user id (no separate user_id column)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, household_id, display_name')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Profile not found' },
        { status: 500 }
      )
    };
  }

  return {
    success: true,
    profile: profile as UserProfile
  };
}
