// middleware.ts — Session guard only (Edge Runtime safe)
// RBAC jest obsługiwany na poziomie stron/komponentów, nie tutaj
// Edge Runtime ogranicza: zero @/ importów, zero Node.js APIs

import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sprawdź czy jest sesja Supabase w cookies
  // Supabase przechowuje sesję jako sb-<ref>-auth-token lub sb-access-token
  const hasSbToken = request.cookies.getAll().some(
    (c) =>
      c.name.startsWith('sb-') &&
      (c.name.endsWith('-auth-token') || c.name.endsWith('-auth-token.0') || c.name.endsWith('-auth-token.1'))
  );

  // Brak sesji → redirect do /login
  if (!hasSbToken) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Sesja istnieje → przepuść (strony same weryfikują rolę przez RoleContext)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Chroń tylko strony aplikacji — nie API routes, nie statyczne pliki
    '/dashboard/:path*',
    '/home/:path*',
    '/settings/:path*',
    '/story/:path*',
  ],
};
