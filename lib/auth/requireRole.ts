/**
 * lib/auth/requireRole.ts
 * STORY-7.2 — Auth guard utilities for API routes.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type AuthResult =
  | { success: true; userId: string; email?: string }
  | NextResponse

export type AdminAuthResult =
  | { success: true; userId: string }
  | NextResponse

// Alias types for routes that use the longer naming
export type RequireAuthResult = AuthResult
export type RequireAdminResult = AdminAuthResult

/**
 * Require any authenticated user (USER, ADMIN, etc.)
 * Returns user data on success, or a 401 Response on failure.
 */
export async function requireAuth(req?: Request): Promise<AuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    )
  }

  return { success: true, userId: user.id, email: user.email }
}

/**
 * Require ADMIN role
 * Returns user data on success, or a 401/403 Response on failure.
 */
export async function requireAdmin(req?: Request): Promise<AdminAuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    )
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleError || !roleData) {
    return NextResponse.json(
      { error: 'User profile not found.' },
      { status: 403 }
    )
  }

  if (roleData.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden. ADMIN role required.' },
      { status: 403 }
    )
  }

  return { success: true, userId: user.id }
}
