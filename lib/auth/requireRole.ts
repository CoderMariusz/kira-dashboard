/**
 * lib/auth/requireRole.ts
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
}
