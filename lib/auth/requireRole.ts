/**
 * lib/auth/requireRole.ts
<<<<<<< HEAD
 * STORY-7.2 — RBAC helpers for Next.js App Router API routes.
 *
 * Uses Supabase SSR (createClient reads cookies from Next.js request context).
 * The optional `_req` param is accepted for API parity but unused — Supabase
 * obtains the session from Next.js cookies() automatically.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequireAdminResult = { user: User; role: 'ADMIN' } | NextResponse;
export type RequireAuthResult = { user: User; role: string } | NextResponse;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * requireAdmin — must be called from a server context (API route / Server Action).
 * Returns { user, role: 'ADMIN' } on success.
 * Returns NextResponse 401 when there is no session.
 * Returns NextResponse 403 when the user's role is not ADMIN.
 */
export async function requireAdmin(_req?: Request): Promise<RequireAdminResult> {
  const supabase = await createClient();
=======
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
>>>>>>> origin/feature/STORY-7.3

  const {
    data: { user },
    error: authError,
<<<<<<< HEAD
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Brak autoryzacji. Zaloguj się ponownie.' },
      { status: 401 }
    );
=======
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
>>>>>>> origin/feature/STORY-7.3
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
<<<<<<< HEAD
    .single();

  if (roleError || !roleData || roleData.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Brak uprawnień do zarządzania golden tasks' },
      { status: 403 }
    );
  }

  return { user, role: 'ADMIN' };
}

/**
 * requireAuth — must be called from a server context (API route / Server Action).
 * Returns { user, role } for any authenticated user (any role).
 * Returns NextResponse 401 when there is no session.
 */
export async function requireAuth(_req?: Request): Promise<RequireAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Brak autoryzacji. Zaloguj się ponownie.' },
      { status: 401 }
    );
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = !roleError && roleData ? (roleData.role as string) : 'UNKNOWN';

  return { user, role };
=======
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
>>>>>>> origin/feature/STORY-7.3
}
