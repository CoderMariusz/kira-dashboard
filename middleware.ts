/**
 * middleware.ts — Next.js App Router middleware
 * STORY-7.2: Protects authenticated routes including /dashboard/eval.
 *
 * Any unauthenticated request to a protected path is redirected to /login.
 * Role-based write restrictions are enforced inside API routes via requireAdmin().
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static (static files)
     *  - _next/image (image optimisation)
     *  - favicon.ico, sitemap.xml, robots.txt, manifest.*
     *  - /login (public auth page)
     *
     * Note: /api/auth/logout is NOT excluded (it requires session check for security).
     * This covers /dashboard/eval automatically (AC-1).
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\..+|login).*)',
  ],
};
