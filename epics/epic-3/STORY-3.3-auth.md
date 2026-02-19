---
story_id: STORY-3.3
title: "Middleware Next.js blokuje dostęp do chronionych route'ów na podstawie roli z user_roles — RBAC"
epic: EPIC-3
module: auth
domain: auth
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: none
api_reference: none
priority: must
estimated_effort: 10h
depends_on: STORY-3.1, STORY-3.2
blocks: STORY-3.4, STORY-3.5, STORY-3.7, STORY-3.8
tags: [auth, rbac, middleware, edge-runtime, supabase, route-protection, cache]
---

## 🎯 User Story

**Jako** system
**Chcę** aby Next.js middleware weryfikował rolę użytkownika z bazy `user_roles` i blokował dostęp do chronionych ścieżek na podstawie reguł RBAC
**Żeby** użytkownik z rolą HELPER nie mógł wejść na `/dashboard`, a ADMIN mógł wejść wszędzie — niezależnie od tego czy próbuje ominąć frontend

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik główny: `middleware.ts` w root projektu (obok `package.json`, `next.config.ts`)
- Supabase middleware helper: `src/lib/supabase/middleware.ts` (z STORY-3.2)
- **Uwaga:** `middleware.ts` w Next.js **zawsze działa na Edge Runtime** (`runtime: 'edge'` jest domyślny dla middleware) — nie możesz używać Node.js APIs. `@supabase/ssr` jest edge-compatible.
- Cache roli: cookie `x-user-role` ustawiane przez middleware, odczytywane w kolejnych requestach

### Powiązane pliki
- `middleware.ts` — zastępuje wersję z STORY-3.2 (rozszerzamy o RBAC)
- `src/lib/supabase/middleware.ts` — `updateSession()` z STORY-3.2 (reuse)
- `src/lib/types/roles.ts` — (opcjonalnie) stałe i typy dla ról (utwórz jeśli nie istnieje)

### Stan systemu przed tą story
- STORY-3.1 zakończona: tabela `public.user_roles` istnieje z RLS
- STORY-3.2 zakończona: `src/lib/supabase/middleware.ts` istnieje z `updateSession()`, middleware.ts podstawowy istnieje
- Supabase klientem Edge-compatible (createServerClient z @supabase/ssr) — ✅ kompatybilne z Edge Runtime
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` dostępne w Edge Runtime

---

## ✅ Acceptance Criteria

### AC-1: Niezalogowany użytkownik na dowolnym chronionym route jest przekierowany do /login
GIVEN: Brak cookie sesji Supabase (niezalogowany użytkownik)
WHEN: Użytkownik otwiera URL `/dashboard` lub `/home` lub `/settings/users` w przeglądarce
THEN: Middleware wykrywa brak sesji (`supabase.auth.getUser()` zwraca `user = null`)
AND: Response to `302 Found` z `Location: /login`
AND: Oryginalna ścieżka nie jest renderowana (zero RSC calls do /dashboard)

### AC-2: HELPER próbuje wejść na /dashboard — redirect do /home/tasks
GIVEN: Zalogowany użytkownik Zuza z rolą `HELPER` ma aktywną sesję (cookie Supabase ważne)
WHEN: Otwiera URL `http://localhost:3000/dashboard` lub `http://localhost:3000/dashboard/pipeline`
THEN: Middleware odczytuje rolę (`HELPER`) — warunek: role !== 'ADMIN'
AND: Response to `302 Found` z `Location: /home/tasks`
AND: Strona `/dashboard` NIE jest renderowana

### AC-3: HELPER_PLUS próbuje wejść na /dashboard — redirect do /home
GIVEN: Zalogowany użytkownik Angelika z rolą `HELPER_PLUS` ma aktywną sesję
WHEN: Otwiera URL `http://localhost:3000/dashboard`
THEN: Middleware redirect `302 Found` z `Location: /home`
AND: Strona `/dashboard` NIE jest renderowana

### AC-4: HELPER próbuje wejść na /home/analytics — redirect do /home/tasks
GIVEN: Zalogowany użytkownik Zuza z rolą `HELPER` ma aktywną sesję
WHEN: Otwiera URL `http://localhost:3000/home/analytics`
THEN: Middleware odczytuje rolę (`HELPER`) — warunek: role !== 'ADMIN' && role !== 'HELPER_PLUS'
AND: Response to `302 Found` z `Location: /home/tasks`

### AC-5: HELPER_PLUS może wejść na /home/analytics
GIVEN: Zalogowany użytkownik Angelika z rolą `HELPER_PLUS` ma aktywną sesję
WHEN: Otwiera URL `http://localhost:3000/home/analytics`
THEN: Middleware przepuszcza request (`NextResponse.next()` lub `supabaseResponse`)
AND: Strona `/home/analytics` jest renderowana normalnie

### AC-6: HELPER może wejść na /home/* (z wyjątkiem /home/analytics)
GIVEN: Zalogowany użytkownik Zuza z rolą `HELPER` ma aktywną sesję
WHEN: Otwiera URL `http://localhost:3000/home/tasks` lub `http://localhost:3000/home/shopping`
THEN: Middleware przepuszcza request bez redirect
AND: Strona jest renderowana normalnie

### AC-7: HELPER i HELPER_PLUS nie mogą wejść na /settings/users — redirect do /home
GIVEN: Zalogowany użytkownik Angelika z rolą `HELPER_PLUS` ma aktywną sesję
WHEN: Otwiera URL `http://localhost:3000/settings/users`
THEN: Middleware redirect `302 Found` z `Location: /home`
AND: Strona `/settings/users` NIE jest renderowana

### AC-8: Rola jest cache'owana w cookie x-user-role — brak DB query przy każdym request
GIVEN: Zalogowany użytkownik Mariusz wykonał pierwszy request (middleware odczytał rolę z DB i ustawił cookie)
WHEN: Wykonuje drugi request do `/dashboard/pipeline` (w tej samej sesji przeglądarki)
THEN: Middleware odczytuje rolę z cookie `x-user-role=ADMIN` (nie wykonuje zapytania do Supabase DB)
AND: Response time jest niższy (brak round-trip do bazy)
AND: Cookie `x-user-role` jest `httpOnly`, `secure` (w produkcji), `sameSite=lax`

### AC-9: Cache roli jest inwalidowany przy zmianie roli przez ADMIN
GIVEN: Cookie `x-user-role=HELPER` istnieje dla Angeliki, ADMIN właśnie zmienił jej rolę na `HELPER_PLUS`
WHEN: Angelika wykonuje kolejny request
THEN: Middleware wykrywa niespójność — nie ma prostego mechanizmu push invalidation, więc:
**Akceptowalne podejście A:** Cookie `x-user-role` ma krótki TTL (np. 5 minut) — po TTL middleware odpytuje DB ponownie
**Akceptowalne podejście B:** Przy każdym request porównuj timestamp ostatniego role-check z DB (dodaj `x-role-checked-at` cookie)
**Minimalne wymaganie:** TTL cookie roli ≤ 10 minut (tak żeby zmiana roli była widoczna w ciągu 10 minut)

### AC-10: ADMIN ma dostęp do wszystkich routes
GIVEN: Zalogowany użytkownik Mariusz z rolą `ADMIN` ma aktywną sesję
WHEN: Otwiera kolejno: `/dashboard`, `/home`, `/home/analytics`, `/home/tasks`, `/settings/users`
THEN: Middleware przepuszcza każdy z tych requestów bez żadnego redirect
AND: Każda strona jest renderowana normalnie

---

## 🔐 Szczegóły Auth

### Role w systemie
- `ADMIN` (Mariusz): dostęp do wszystkich routes
- `HELPER_PLUS` (Angelika): `/home/*` + `/home/analytics`, NIE `/dashboard/*`, NIE `/settings/users`
- `HELPER` (Zuza, Iza): tylko `/home/*` z wyjątkiem `/home/analytics`

### Macierz uprawnień (route access)

| Route pattern | ADMIN | HELPER_PLUS | HELPER | Brak roli |
|---------------|-------|-------------|--------|-----------|
| `/dashboard/*` | ✅ | ❌ → `/home` | ❌ → `/home/tasks` | ❌ → `/login` |
| `/home/analytics` | ✅ | ✅ | ❌ → `/home/tasks` | ❌ → `/login` |
| `/home/*` (inne) | ✅ | ✅ | ✅ | ❌ → `/login` |
| `/settings/users` | ✅ | ❌ → `/home` | ❌ → `/home/tasks` | ❌ → `/login` |
| `/api/*` | patrz STORY-3.4 | patrz STORY-3.4 | patrz STORY-3.4 | ❌ → `/login` |

### Implementacja w Supabase

#### Kompletna implementacja middleware.ts

Poniżej kompletny kod `middleware.ts` (zastępuje wersję z STORY-3.2):

```typescript
// middleware.ts — RBAC + session refresh
// Lokalizacja: [root projektu]/middleware.ts (obok package.json)
// Runtime: Edge (domyślny dla Next.js middleware)

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// Typy ról — muszą być identyczne jak CHECK constraint w DB
type UserRole = 'ADMIN' | 'HELPER_PLUS' | 'HELPER';

// ============================================================
// REGUŁY DOSTĘPU PER ROUTE
// ============================================================
// Kolejność ma znaczenie — bardziej specyficzne ścieżki najpierw

function getRedirectForRole(pathname: string, role: UserRole | null): string | null {
  // Brak roli = redirect do /login (sesja jest, ale rola nie przypisana)
  if (role === null) {
    return '/login';
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
  const cachedRole = request.cookies.get(ROLE_COOKIE_NAME)?.value as UserRole | undefined;

  if (cachedRole && ['ADMIN', 'HELPER_PLUS', 'HELPER'].includes(cachedRole)) {
    return cachedRole;
  }

  // Cache miss → odpytaj DB
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null; // brak roli
  }

  const role = data.role as UserRole;

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

  // Krok 4: Jest sesja — odczytaj rolę (z cache lub DB)
  const role = await getRoleFromDBOrCache(request, supabase, user.id, supabaseResponse);

  // Krok 5: Sprawdź uprawnienia per pathname
  const redirectTarget = getRedirectForRole(pathname, role);

  if (redirectTarget) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectTarget;
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Przekopiuj cookies sesji do redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // Krok 6: Dostęp dozwolony — zwróć supabaseResponse (z odświeżonym tokenem)
  return supabaseResponse;
}

// ============================================================
// MATCHER — które ścieżki przechodzą przez middleware
// ============================================================
export const config = {
  matcher: [
    // Wyklucz: pliki statyczne, obrazy, favicon, login
    // Wszystko inne — sprawdzaj
    '/((?!_next/static|_next/image|favicon.ico|login).*)',
  ],
};
```

#### Uwagi do implementacji (KRYTYCZNE dla edge runtime)

1. **`supabase.auth.getUser()` vs `getSession()`:**
   - ZAWSZE używaj `getUser()` — weryfikuje token z Supabase Auth Server
   - `getSession()` czyta tylko z cookies (brak weryfikacji sygnatury) — podatne na manipulację
   - Dokładna kolejność: `createServerClient` → `getUser()` → reszta logiki

2. **Kopiowanie cookies do redirect response:**
   - Gdy robisz `NextResponse.redirect()`, musisz ręcznie przekopiować cookies sesji Supabase
   - Bez tego token refresh nie zostanie zapisany (użytkownik zostanie wylogowany)
   - Kod: `supabaseResponse.cookies.getAll().forEach((cookie) => { redirectResponse.cookies.set(...) })`

3. **Edge Runtime — co NIE działa:**
   - `fs`, `path`, `crypto` z Node.js — NIE dostępne
   - `import type` z `next/headers` (`cookies()`) — NIE dostępne w middleware (tylko w Server Components)
   - `@supabase/ssr` jest edge-compatible — ✅
   - Fetch API jest dostępne — ✅

4. **Cache TTL 5 minut:**
   - Zmiana roli przez ADMIN staje się widoczna max po 5 minutach
   - Wylogowanie → cookie `x-user-role` jest kasowany przy redirect na /login
   - Jeśli zmiana roli jest krytyczna → zaimplementuj endpoint `POST /api/auth/invalidate-role-cache` który kasuje cookie

#### Middleware / Guard (frontend)

- Middleware sprawdza rolę przy każdym request (edge, przed renderowaniem RSC)
- Brak dodatkowych client-side guards w tej story
- `usePermissions()` hook do conditional UI → STORY-3.5
- Sidebar conditional → STORY-3.7

### Scenariusze uprawnień do przetestowania

- [ ] Niezalogowany → `/dashboard` → redirect `/login`
- [ ] HELPER → `/dashboard` → redirect `/home/tasks`
- [ ] HELPER_PLUS → `/dashboard` → redirect `/home`
- [ ] HELPER → `/home/analytics` → redirect `/home/tasks`
- [ ] HELPER_PLUS → `/home/analytics` → ✅ dostęp
- [ ] HELPER → `/home/tasks` → ✅ dostęp
- [ ] HELPER → `/settings/users` → redirect `/home/tasks`
- [ ] HELPER_PLUS → `/settings/users` → redirect `/home`
- [ ] ADMIN → wszystkie powyższe routes → ✅ dostęp wszędzie
- [ ] Drugi request ADMIN → `/dashboard` → rola z cookie (sprawdź brak DB query w logach)
- [ ] Po zmianie roli HELPER→HELPER_PLUS przez ADMIN → po max 5 min Angelika ma dostęp do `/home/analytics`

---

## ⚠️ Edge Cases

### EC-1: Użytkownik ma sesję ale brak rekordu w user_roles (rola null)
Scenariusz: Nowe konto dodane przez Supabase Auth ale bez wywołania STORY-3.4 — brak wiersza w `user_roles`
Oczekiwane zachowanie:
- `getRoleFromDBOrCache()` zwraca `null`
- `getRedirectForRole(pathname, null)` zwraca `'/login'`
- Użytkownik jest przekierowany na `/login` z aktywną sesją
- **Problem:** Pętla redirect! Użytkownik jest na `/login` z sesją → middleware rzuca na `/login` → pętla
- **Rozwiązanie:** W middleware, jeśli `role === null` i `!pathname.startsWith('/login')` → redirect na specjalną stronę `/setup` lub `/access-denied` zamiast `/login`
Komunikat dla użytkownika: strona `/access-denied` z tekstem "Twoje konto nie ma przypisanej roli. Skontaktuj się z administratorem."

### EC-2: Concurrent requests — race condition przy zapisie cache cookie
Scenariusz: Użytkownik otwiera 3 taby jednocześnie (3 równoległe requests do middleware)
Oczekiwane zachowanie: Każdy request niezależnie odpytuje DB (cache miss na wszystkich 3) i ustawia cookie. Wynik jest idempotentny — ta sama rola jest zapisywana 3 razy. Brak błędu.
Uwaga: Nie ma transakcyjności na poziomie cookies. Race condition jest akceptowalny (wynik poprawny).

### EC-3: Supabase DB niedostępny — błąd przy query user_roles
Scenariusz: Supabase jest chwilowo niedostępne, `supabase.from('user_roles').select(...)` zwraca network error
Oczekiwane zachowanie: `getRoleFromDBOrCache()` zwraca `null` (error path)
Middleware: redirect na `/access-denied` (tak samo jak EC-1)
Logging: `console.error('[RBAC] Failed to fetch role from DB:', error)` — logrowalny błąd
NIE: nie rzucaj unhandled exception (middleware crash = 500 dla całej aplikacji)

### EC-4: Manipulacja cookie x-user-role przez użytkownika
Scenariusz: Hacker modyfikuje cookie `x-user-role=ADMIN` w DevTools (ma rolę HELPER)
Oczekiwane zachowanie:
- Cookie `x-user-role` jest `httpOnly=true` → niedostępne przez JavaScript → nie można zmodyfikować przez `document.cookie`
- Ale: httpOnly nie chroni przed modyfikacją w DevTools Network → Application → Cookies tab
- **Krytyczne zabezpieczenie:** Nawet przy sfałszowanej roli w cookie, RLS w Supabase DB blokuje nieautoryzowane operacje (insert/update/delete)
- **Middleware:** Jeśli TTL wygaśnie i middleware ponownie odpyta DB — prawdziwa rola zostanie odczytana i cookie zostanie nadpisane
- **RBAC jest defense-in-depth** — middleware to warstwa UX, RLS to warstwa bezpieczeństwa

### EC-5: /api/* routes — czy middleware chroni API endpoints?
Scenariusz: HELPER wykonuje `fetch('/api/users', { method: 'DELETE' })` bezpośrednio
Oczekiwane zachowanie: Matcher `'/((?!_next/static|...).*)'` obejmuje `/api/*` routes
Middleware sprawdza sesję i rolę dla `/api/users` (jeśli jest w chronionych routes)
Jeśli HELPER próbuje `/api/users` → redirect response zamiast JSON → błąd 302 w fetch
Pełna ochrona API (właściwy JSON 403) → STORY-3.4 (backend API routes z własną weryfikacją)

---

## 🚫 Out of Scope tej Story
- API routes authorization (własna weryfikacja roli w handler) — STORY-3.4
- `useUser()` / `usePermissions()` hook — STORY-3.5
- Conditional sidebar (ukrywanie linków per rola w UI) — STORY-3.7
- Strona `/settings/users` — STORY-3.8
- Strona `/access-denied` (jeśli brak roli) — może być osobna story lub dodana tu jako ekstra
- OAuth / magic link — Out of Scope EPIC-3
- Rate limiting middleware — poza tym epicem

---

## ✔️ Definition of Done
- [ ] `middleware.ts` w root projektu zawiera pełną logikę RBAC z `getRedirectForRole()`
- [ ] Matcher: `'/((?!_next/static|_next/image|favicon.ico|login).*)'` — poprawny
- [ ] Cache roli w cookie `x-user-role`: `httpOnly=true`, `maxAge=300` (5 minut)
- [ ] Niezalogowany → dowolny chroniony route → redirect `/login` ✅ (test w przeglądarce)
- [ ] HELPER → `/dashboard` → redirect `/home/tasks` ✅
- [ ] HELPER_PLUS → `/dashboard` → redirect `/home` ✅
- [ ] HELPER → `/home/analytics` → redirect `/home/tasks` ✅
- [ ] HELPER_PLUS → `/home/analytics` → dostęp ✅
- [ ] ADMIN → wszystkie routes → dostęp ✅
- [ ] HELPER / HELPER_PLUS → `/settings/users` → redirect ✅
- [ ] Drugi request → rola z cookie (sprawdź `console.log` w middleware — brak DB query) ✅
- [ ] `npm run build` bez błędów TypeScript
- [ ] `npm run lint` bez błędów
- [ ] Każda rola z macierzy przetestowana manualnie
- [ ] Bezpośrednie wywołanie API bez uprawnień zwraca 403 (lub redirect — akceptowalny dla tej story)
- [ ] UI nie pokazuje przycisków/akcji do których user nie ma dostępu (weryfikacja: STORY-3.7)
- [ ] RLS blokuje dostęp nawet z pominięciem frontend (weryfikacja przez Supabase Studio SQL editor)
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
