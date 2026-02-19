// middleware.ts — RBAC + session refresh
// Lokalizacja: [root projektu]/middleware.ts (obok package.json)
// Runtime: Edge (domyślny dla Next.js middleware)

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { type UserRole, isValidRole } from '@/lib/types/roles';

// ============================================================
// REGUŁY DOSTĘPU PER ROUTE
// ============================================================
// Kolejność ma znaczenie — bardziej specyficzne ścieżki najpierw

function getRedirectForRole(pathname: string, role: UserRole | null): string | null {
  // Brak roli = redirect do /access-denied (sesja jest, ale rola nie przypisana)
  if (role === null) {
    return '/access-denied';
  }

  // /settings/users — tylko ADMIN
  if (pathname.startsWith('/settings/users')) {
    if (role !== 'ADMIN') {
      return role === 'HELPER_PLUS' ? '/home' : '/home/tasks';
    }
    return null; // ADMIN — przepuść
  }

  // /dashboard/* — tylko ADMIN
  if (pathname.startsWith('/dashboard')) {
    if (role !== 'ADMIN') {
      return role === 'HELPER_PLUS' ? '/home' : '/home/tasks';
    }
    return null; // ADMIN — przepuść
  }

  // /home/analytics — ADMIN lub HELPER_PLUS
  if (pathname === '/home/analytics' || pathname.startsWith('/home/analytics/')) {
    if (role === 'HELPER') {
      return '/home/tasks';
    }
    return null; // ADMIN, HELPER_PLUS — przepuść
  }

  // /home/* — wszyscy zalogowani
  if (pathname.startsWith('/home')) {
    return null; // przepuść
  }

  // /settings/* (inne niż /settings/users) — tylko ADMIN
  if (pathname.startsWith('/settings')) {
    if (role !== 'ADMIN') {
      return role === 'HELPER_PLUS' ? '/home' : '/home/tasks';
    }
    return null;
  }

  // Domyślnie: przepuść (inne ścieżki nie zdefiniowane w RBAC)
  return null;
}

// ============================================================
// CACHE ROLI W COOKIE
// ============================================================
const ROLE_COOKIE_NAME = 'x-user-role';
const ROLE_COOKIE_TTL_SECONDS = 300; // 5 minut

async function getRoleFromDBOrCache(
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  response: NextResponse
): Promise<UserRole | null> {
  // Sprawdź cache cookie
  const cachedRole = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  if (cachedRole && isValidRole(cachedRole)) {
    return cachedRole;
  }

  // Cache miss → odpytaj DB
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('[RBAC] Failed to fetch role from DB:', error);
    return null; // brak roli
  }

  const rawRole = (data as { role: string }).role;

  if (!isValidRole(rawRole)) {
    console.error('[RBAC] Unknown role value from DB:', rawRole);
    return null;
  }

  const role: UserRole = rawRole;

  // Zapisz w cookie (response cookies — propagowane do przeglądarki)
  response.cookies.set(ROLE_COOKIE_NAME, role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ROLE_COOKIE_TTL_SECONDS,
    path: '/',
  });

  return role;
}

// ============================================================
// GŁÓWNA FUNKCJA MIDDLEWARE
// ============================================================

export async function middleware(request: NextRequest) {
  // Krok 1: Inicjuj Supabase client z cookie-based session (edge-compatible)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Krok 2: Pobierz sesję (getUser() — bezpieczne, weryfikuje z Supabase Auth Server)
  // KRYTYCZNE: nie pisz kodu między createServerClient a getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Krok 3: Brak sesji → redirect /login
  if (!user) {
    // Wyczyść cache roli jeśli był ustawiony
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.cookies.delete(ROLE_COOKIE_NAME);
    return redirectResponse;
  }

  // Krok 4: Zalogowany user na /login → redirect do domyślnego widoku
  // (Zostanie obsłużony przez getRedirectForRole jeśli /login nie jest w matcherze,
  //  ale dodajemy explicit check jako safety net)
  if (pathname.startsWith('/login')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/home';
    return NextResponse.redirect(redirectUrl);
  }

  // Krok 5: Jest sesja — odczytaj rolę (z cache lub DB)
  const role = await getRoleFromDBOrCache(request, supabase, user.id, supabaseResponse);

  // Krok 6: Sprawdź uprawnienia per pathname
  const redirectTarget = getRedirectForRole(pathname, role);

  if (redirectTarget) {
    // Unikaj pętli redirect (jeśli sam target jest zablokowany dla danej roli)
    if (redirectTarget === pathname) {
      return supabaseResponse;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectTarget;
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Przekopiuj cookies sesji do redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // Krok 7: Dostęp dozwolony — zwróć supabaseResponse (z odświeżonym tokenem)
  return supabaseResponse;
}

// ============================================================
// MATCHER — które ścieżki przechodzą przez middleware
// ============================================================
export const config = {
  matcher: [
    // Wyklucz: pliki statyczne, obrazy, favicon, login, access-denied
    // Wszystko inne — sprawdzaj
    '/((?!_next/static|_next/image|favicon.ico|login|access-denied|api/bridge).*)',
  ],
};
