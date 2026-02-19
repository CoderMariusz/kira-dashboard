---
story_id: STORY-3.2
title: "System konfiguruje Supabase Auth — migruje login page i middleware z archive/, dodaje redirect per rola"
epic: EPIC-3
module: auth
domain: auth
status: ready
difficulty: moderate
recommended_model: kimi-k2.5
ux_reference: none
api_reference: none
priority: must
estimated_effort: 6h
depends_on: STORY-3.1
blocks: STORY-3.3, STORY-3.5, STORY-3.6
tags: [auth, supabase, login, middleware, session, redirect, migration]
---

## 🎯 User Story

**Jako** użytkownik systemu (Mariusz / Angelika / Zuza / Iza)
**Chcę** móc zalogować się emailem i hasłem na stronie `/login` i trafić automatycznie do odpowiedniego widoku dla mojej roli
**Żeby** każdy członek rodziny widział swój dedykowany widok bez ręcznej nawigacji

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Supabase client (browser): `src/lib/supabase/client.ts`
- Supabase client (server/RSC/API): `src/lib/supabase/server.ts`
- Supabase middleware helper: `src/lib/supabase/middleware.ts`
- Login page: `src/app/(auth)/login/page.tsx` LUB `src/app/login/page.tsx`
- Logout API route: `src/app/api/auth/logout/route.ts`
- Root middleware: `middleware.ts` (w katalogu root projektu, obok `package.json`)
- Env vars: `.env.local`

### Powiązane pliki (źródła do migracji — archive/)
Poniższe pliki z `archive/src/` są gotowe do skopiowania z modyfikacjami:
- `archive/src/lib/supabase/client.ts` → `src/lib/supabase/client.ts` (kopiuj bez zmian)
- `archive/src/lib/supabase/server.ts` → `src/lib/supabase/server.ts` (kopiuj bez zmian)
- `archive/src/lib/supabase/middleware.ts` → `src/lib/supabase/middleware.ts` (kopiuj, zmodyfikuj protected paths i dodaj RBAC redirect)
- `archive/src/app/login/page.tsx` → `src/app/login/page.tsx` (kopiuj, zmodyfikuj redirect po zalogowaniu)
- `archive/middleware.ts` → `middleware.ts` (kopiuj, zmodyfikuj matcher)

### Stan systemu przed tą story
- STORY-3.1 zakończona: tabela `public.user_roles` istnieje z seedem ADMIN dla Mariusza
- Supabase projekt istnieje z włączoną auth (email/password)
- `.env.local` zawiera: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Pakiet `@supabase/ssr` zainstalowany: `npm install @supabase/ssr @supabase/supabase-js`
- Projekt Next.js 14+ z App Router (`src/app/` directory structure)
- shadcn/ui zainstalowane (Button, Input, Label, Card komponenty dostępne)

---

## ✅ Acceptance Criteria

### AC-1: Supabase client (browser) jest dostępny jako singleton
GIVEN: Plik `src/lib/supabase/client.ts` istnieje
WHEN: Komponent `'use client'` importuje `import { createClient } from '@/lib/supabase/client'` i wywołuje `createClient()`
THEN: Zwraca instancję Supabase browser client skonfigurowaną z `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`
AND: Cookies sesji są automatycznie zarządzane przez `@supabase/ssr` (nie trzeba ręcznie czytać/pisać cookies)

### AC-2: Supabase client (server) obsługuje cookie-based session w Server Components i API Routes
GIVEN: Plik `src/lib/supabase/server.ts` istnieje
WHEN: Server Component lub API Route wywołuje `const supabase = await createClient()` z `'@/lib/supabase/server'`
THEN: Client jest skonfigurowany z `getAll`/`setAll` cookies z Next.js `cookies()` helper
AND: `supabase.auth.getUser()` zwraca zalogowanego użytkownika na podstawie cookie sesji (bez JWT w URL)

### AC-3: Strona /login renderuje formularz email + hasło z polskim UI
GIVEN: Użytkownik otwiera w przeglądarce URL `http://localhost:3000/login`
WHEN: Strona się ładuje
THEN: Widoczne są:
- Nagłówek strony (logo/emoji 🏠 lub equivalent)
- Pole `type="email"` z `placeholder="twoj@email.com"` i `<Label>Email</Label>`
- Pole `type="password"` z `placeholder="••••••••"` i `<Label>Hasło</Label>`
- Przycisk `type="submit"` z tekstem "Zaloguj się"
AND: Formularz ma `onSubmit` handler który wywołuje `supabase.auth.signInWithPassword()`

### AC-4: Loading state podczas logowania
GIVEN: Użytkownik wpisał email i hasło na stronie `/login`
WHEN: Klika przycisk "Zaloguj się"
THEN: Przycisk zmienia tekst na "Logowanie..." i jest `disabled={true}` (state `loading = true`)
AND: Pola formularza pozostają edytowalne (nie zablokowane)
AND: Po zakończeniu (sukces lub błąd) `loading` wraca do `false`

### AC-5: Error message po błędnym logowaniu
GIVEN: Użytkownik wpisał błędne hasło na stronie `/login`
WHEN: Klika "Zaloguj się" i Supabase zwraca błąd `Invalid login credentials`
THEN: Pod formularzem wyświetla się komunikat po polsku: "Błąd: Invalid login credentials" (lub zlokalizowany: "Nieprawidłowy email lub hasło")
AND: Komunikat ma czerwony kolor tekstu (`text-red-600` lub odpowiednik)
AND: Użytkownik pozostaje na stronie `/login`

### AC-6: Redirect per rola po pomyślnym zalogowaniu
GIVEN: Użytkownik pomyślnie zalogował się (Supabase Auth zwraca sesję bez błędu)
WHEN: Login handler odczytuje rolę z `user_roles` table (`SELECT role FROM user_roles WHERE user_id = auth.uid()`)
THEN:
- Jeśli rola = `'ADMIN'` → `router.push('/dashboard')`
- Jeśli rola = `'HELPER_PLUS'` → `router.push('/home')`
- Jeśli rola = `'HELPER'` → `router.push('/home/tasks')`
- Jeśli rola nie istnieje w `user_roles` (brak rekordu) → `router.push('/home')` (fallback)
AND: Redirect następuje w ciągu 1 sekundy od sukcesu logowania

### AC-7: Middleware odświeża token Supabase przy każdym request
GIVEN: Plik `middleware.ts` istnieje w root projektu z importem `updateSession` z `src/lib/supabase/middleware.ts`
WHEN: Dowolny request HTTP (GET /dashboard, GET /home, GET /api/...) trafia do Next.js
THEN: Middleware automatycznie odświeża token JWT Supabase (wywołuje `supabase.auth.getUser()` co aktualizuje cookie)
AND: `supabaseResponse` jest zwrócony (nie `NextResponse.next()` bez modyfikacji — co ważne dla poprawności cookies)

### AC-8: Logout endpoint niszczy sesję i przekierowuje do /login
GIVEN: Zalogowany użytkownik (dowolna rola) ma aktywną sesję
WHEN: Wykonywane jest `POST /api/auth/logout` (np. przez fetch lub form action)
THEN: Server-side `supabase.auth.signOut()` jest wywołane (niszczy sesję w Supabase)
AND: Ciasteczka sesji są wyczyszczone
AND: Response to `303 See Other` z `Location: /login` LUB `200` z JSON `{ success: true }` + client-side redirect do `/login`

---

## 🔐 Szczegóły Auth

### Role w systemie
- `ADMIN` (Mariusz): pełny dostęp — po zalogowaniu → `/dashboard`
- `HELPER_PLUS` (Angelika): home dashboard — po zalogowaniu → `/home`
- `HELPER` (Zuza, Iza): ograniczony widok — po zalogowaniu → `/home/tasks`

### Macierz uprawnień (login redirect)

| Użytkownik | Rola | Redirect po zalogowaniu |
|------------|------|------------------------|
| Mariusz | ADMIN | `/dashboard` |
| Angelika | HELPER_PLUS | `/home` |
| Zuza / Iza | HELPER | `/home/tasks` |
| Brak rekordu w user_roles | — | `/home` (fallback) |

### Implementacja w Supabase

#### Env vars wymagane w .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://[projekt-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

#### Krok 1: src/lib/supabase/client.ts
**Skopiuj verbatim z `archive/src/lib/supabase/client.ts`:**
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  );
}
```
Zmiana względem archive: usuń `// eslint-disable-next-line` i `: any` — dodaj właściwy typ generyczny jeśli masz `Database` type.

#### Krok 2: src/lib/supabase/server.ts
**Skopiuj verbatim z `archive/src/lib/supabase/server.ts`:**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignoruj błąd zapisu cookies
          }
        },
      },
    }
  );
}
```

#### Krok 3: src/lib/supabase/middleware.ts
**Skopiuj z `archive/src/lib/supabase/middleware.ts` i zastąp sekcję protected paths:**
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
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

  // KRYTYCZNE: nie pisz żadnej logiki między createServerClient a getUser()
  const { data: { user } } = await supabase.auth.getUser();

  // Jeśli brak sesji → redirect do /login (logika RBAC w STORY-3.3)
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Jeśli zalogowany i na /login → przekieruj do /home (RBAC redirect w login page)
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  // KRYTYCZNE: zwróć supabaseResponse (nie NextResponse.next())
  return supabaseResponse;
}
```
**UWAGA:** RBAC (sprawdzanie roli przy redirect z /login na /home vs /dashboard) implementujesz w login page AC-6, nie w middleware. Middleware tylko sprawdza CZY jest sesja. Pełny RBAC middleware to STORY-3.3.

#### Krok 4: middleware.ts (root projektu)
**Skopiuj z `archive/middleware.ts` i zaktualizuj matcher:**
```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login).*)',
  ],
};
```
**RÓŻNICA od archive:** matcher pomija `/login` (bo obsługujemy redirect z /login osobno w middleware.ts).

#### Krok 5: src/app/login/page.tsx — login z redirect per rola
**Na bazie `archive/src/app/login/page.tsx` dodaj:**
1. Po `supabase.auth.signInWithPassword()` bez błędu:
2. Odczytaj rolę z `user_roles`:
```typescript
const { data: roleData } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', data.user!.id)
  .single();

const role = roleData?.role;
if (role === 'ADMIN') {
  router.push('/dashboard');
} else if (role === 'HELPER_PLUS') {
  router.push('/home');
} else {
  router.push('/home/tasks'); // HELPER lub brak roli
}
```
**UWAGA:** `supabase.from('user_roles').select(...)` działa z anon key bo RLS SELECT policy pozwala zalogowanemu widzieć swój wiersz.

#### Krok 6: src/app/api/auth/logout/route.ts — logout endpoint
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'), {
    status: 303,
  });
}
```

#### Middleware / Guard (frontend)
- Login page (`'use client'`) — po zalogowaniu sprawdza rolę i robi `router.push()`
- Middleware (edge) — sprawdza istnienie sesji, brak → `/login`
- Pełne RBAC (sprawdzanie roli per route) → STORY-3.3

### Scenariusze uprawnień do przetestowania
- [ ] Mariusz (ADMIN) loguje się → trafia na `/dashboard`
- [ ] Angelika (HELPER_PLUS) loguje się → trafia na `/home`
- [ ] Zuza (HELPER) loguje się → trafia na `/home/tasks`
- [ ] Niezalogowany użytkownik odwiedza `/dashboard` → redirect `/login`
- [ ] Zalogowany użytkownik odwiedza `/login` → redirect `/home`
- [ ] Logout → redirect `/login`, próba powrotu do `/dashboard` → redirect `/login`

---

## ⚠️ Edge Cases

### EC-1: Użytkownik nie ma rekordu w user_roles (nowe konto bez przypisanej roli)
Scenariusz: Nowe konto zostało dodane przez ADMIN w Supabase Auth ale STORY-3.4 nie przypisała jeszcze roli
Oczekiwane zachowanie: `supabase.from('user_roles').select('role').single()` zwraca `null` lub error `PGRST116`
Obsługa w kodzie:
```typescript
const role = roleData?.role ?? null;
// null → fallback redirect
router.push('/home/tasks'); // najbardziej restrykcyjny fallback
```
Komunikat dla użytkownika: brak (silent redirect do `/home/tasks`)

### EC-2: Błąd sieci podczas odczytu roli po zalogowaniu
Scenariusz: Po pomyślnym `signInWithPassword()` zapytanie do `user_roles` zwraca błąd sieciowy
Oczekiwane zachowanie: Nie blokuj użytkownika — zrób fallback redirect do `/home/tasks`
Kod:
```typescript
const { data: roleData, error: roleError } = await supabase.from('user_roles')...
if (roleError) {
  console.error('Błąd odczytu roli:', roleError);
  router.push('/home/tasks'); // bezpieczny fallback
  return;
}
```

### EC-3: Użytkownik jest już zalogowany i wchodzi na /login
Scenariusz: Użytkownik z aktywną sesją otwiera URL `/login` bezpośrednio
Oczekiwane zachowanie: Middleware wykrywa `user !== null` i przekierowuje na `/home` (ogólny redirect — RBAC-aware redirect per rola jest w STORY-3.3)
Uwaga: To middleware redirect, nie logika login page

### EC-4: Sesja wygasła (token expired) w trakcie sesji użytkownika
Scenariusz: Użytkownik był zalogowany, token wygasł, wykonuje request do `/dashboard`
Oczekiwane zachowanie: `@supabase/ssr` automatycznie próbuje refresh token (przez `updateSession` w middleware). Jeśli refresh nie uda się → `getUser()` zwraca `null` → middleware redirect na `/login`
Komunikat: strona `/login` z pustym formularzem (brak dodatkowego komunikatu o wygaśnięciu)

---

## 🚫 Out of Scope tej Story
- Pełne RBAC sprawdzanie roli per route (np. blokowanie `/dashboard` dla HELPER) — to STORY-3.3
- Magic link / OAuth — archive ma magic link ale ta story skupia się TYLKO na email+password
- UI strony `/login` w dark theme (pełny design) — STORY-3.6
- Hook `useUser()` / `usePermissions()` — STORY-3.5
- Formularz invite użytkownika — STORY-3.4
- Conditional sidebar — STORY-3.7
- Typy TypeScript `Database` dla `user_roles` — STORY-3.5

---

## ✔️ Definition of Done
- [ ] `src/lib/supabase/client.ts` istnieje i eksportuje `createClient()` (browser)
- [ ] `src/lib/supabase/server.ts` istnieje i eksportuje async `createClient()` (server)
- [ ] `src/lib/supabase/middleware.ts` istnieje z `updateSession()` obsługującym cookie refresh
- [ ] `middleware.ts` w root projektu z poprawnym matcherem (pomija `_next`, `favicon`, `login`)
- [ ] `src/app/login/page.tsx` renderuje formularz z: email, password, przycisk "Zaloguj się"
- [ ] Loading state: przycisk shows "Logowanie..." i `disabled` podczas requestu
- [ ] Error state: red message `"Błąd: ..."` po failed login
- [ ] Redirect per rola: ADMIN→`/dashboard`, HELPER_PLUS→`/home`, HELPER→`/home/tasks`, null→`/home/tasks`
- [ ] `src/app/api/auth/logout/route.ts` — POST → signOut → redirect `/login`
- [ ] Niezalogowany user na chronionym route → redirect `/login` (weryfikacja w przeglądarce)
- [ ] Zalogowany ADMIN na `/login` → redirect (nie zatrzymuje się na stronie login)
- [ ] `npm run build` kończy się bez błędów TypeScript
- [ ] Każda rola z macierzy przetestowana manualnie
- [ ] Bezpośrednie wywołanie API bez uprawnień zwraca 403
- [ ] UI nie pokazuje przycisków/akcji do których user nie ma dostępu
- [ ] RLS blokuje dostęp nawet z pominięciem frontend
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
