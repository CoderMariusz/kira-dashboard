---
story_id: STORY-3.4
title: "ADMIN zarządza użytkownikami — zaproszenie, zmiana roli, dezaktywacja"
epic: EPIC-3
module: auth
domain: backend
status: ready
difficulty: complex
recommended_model: codex-5.3
ux_reference: none
api_reference: none
priority: must
estimated_effort: 6h
depends_on: STORY-3.1
blocks: STORY-3.8
tags: [crud, permissions, admin, supabase-admin, user-management, rbac]
---

## 🎯 User Story

**Jako** Mariusz (użytkownik z rolą ADMIN)
**Chcę** móc zapraszać nowych użytkowników, zmieniać ich role i dezaktywować konta przez API
**Żeby** zarządzać dostępem całej rodziny do Kira Dashboard bez ręcznych operacji w Supabase Console

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Trzy endpointy w Next.js 16 App Router (Route Handlers):
- `POST /api/users/invite` — plik: `src/app/api/users/invite/route.ts`
- `PATCH /api/users/[id]/role` — plik: `src/app/api/users/[id]/role/route.ts`
- `DELETE /api/users/[id]` — plik: `src/app/api/users/[id]/route.ts`

### Powiązane pliki
- `src/lib/supabase/server.ts` — `createClient()` z ANON KEY (do weryfikacji JWT + query user_roles callera)
- `src/lib/supabase/admin.ts` — **NOWY PLIK** do stworzenia; `createAdminClient()` z SERVICE_ROLE_KEY (do `auth.admin.*` operacji)
- `src/lib/utils/api-auth.ts` — istniejący helper `authenticateAndGetProfile()` — **NIE używać** w tej story, napisać nowy helper `requireAdmin()`

### Stan systemu przed tą story
- **STORY-3.1 musi być DONE**: tabela `user_roles` istnieje w Supabase z kolumnami: `user_id UUID (PK)`, `role TEXT CHECK (role IN ('ADMIN','HELPER_PLUS','HELPER'))`, `created_at TIMESTAMPTZ`
- Zmienna środowiskowa `SUPABASE_SERVICE_ROLE_KEY` ustawiona w `.env.local` (NIE `NEXT_PUBLIC_` prefix — server-only)
- Zmienna `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY` są już skonfigurowane
- W Supabase Auth istnieje co najmniej jeden użytkownik z rolą ADMIN w tabeli `user_roles`

---

## ✅ Acceptance Criteria

### AC-1: Pomyślne zaproszenie nowego użytkownika
GIVEN: Zalogowany użytkownik z rolą ADMIN wysyła request z ważnym JWT w nagłówku `Authorization: Bearer <token>`
WHEN: Wywołuje `POST /api/users/invite` z body `{"email": "zuza@rodzina.pl", "role": "HELPER"}`
THEN: System wywołuje `supabase.auth.admin.inviteUserByEmail("zuza@rodzina.pl")`
AND: Po otrzymaniu UUID nowego usera system wykonuje `INSERT INTO user_roles (user_id, role) VALUES (newUserId, 'HELPER')`
AND: Endpoint zwraca HTTP 201 z body `{"ok": true, "userId": "<uuid>"}`
AND: Użytkownik `zuza@rodzina.pl` otrzymuje email z linkiem do ustawienia hasła (obsługiwane przez Supabase automatycznie)

### AC-2: Pomyślna zmiana roli użytkownika
GIVEN: Zalogowany ADMIN wysyła request z ważnym JWT
AND: Istnieje użytkownik o ID `abc-123` z rolą `HELPER` w tabeli `user_roles`
AND: Caller NIE jest właścicielem ID `abc-123` (zmienia cudzy rekord)
WHEN: Wywołuje `PATCH /api/users/abc-123/role` z body `{"role": "HELPER_PLUS"}`
THEN: System wykonuje `UPDATE user_roles SET role = 'HELPER_PLUS' WHERE user_id = 'abc-123'`
AND: Endpoint zwraca HTTP 200 z body `{"ok": true}`

### AC-3: Pomyślne usunięcie konta użytkownika
GIVEN: Zalogowany ADMIN wysyła request z ważnym JWT
AND: Istnieje użytkownik o ID `abc-123` w Supabase Auth i tabeli `user_roles`
AND: Caller NIE jest właścicielem ID `abc-123`
AND: Pozostaje co najmniej 2 użytkowników z rolą ADMIN (nie jest ostatnim adminem)
WHEN: Wywołuje `DELETE /api/users/abc-123`
THEN: System wywołuje `supabase.auth.admin.deleteUser("abc-123")`
AND: System wykonuje `DELETE FROM user_roles WHERE user_id = 'abc-123'`
AND: Endpoint zwraca HTTP 200 z body `{"ok": true}`

### AC-4: Blokada dostępu dla non-ADMIN
GIVEN: Zalogowany użytkownik z rolą `HELPER_PLUS` lub `HELPER` wysyła request z ważnym JWT
WHEN: Wywołuje jakikolwiek z 3 endpointów (POST /api/users/invite, PATCH /api/users/[id]/role, DELETE /api/users/[id])
THEN: System sprawdza `user_roles` dla callera i stwierdza rolę != ADMIN
AND: Endpoint zwraca HTTP 403 z body `{"error": "Brak uprawnień. Wymagana rola: ADMIN"}`
AND: Żadna operacja na bazie nie jest wykonywana

### AC-5: Blokada próby zmiany własnej roli
GIVEN: Zalogowany ADMIN (user_id = `admin-xyz`) wysyła request z ważnym JWT
WHEN: Wywołuje `PATCH /api/users/admin-xyz/role` z body `{"role": "HELPER"}`
THEN: System wykrywa że `callerId === params.id`
AND: Endpoint zwraca HTTP 422 z body `{"error": "Nie możesz zmienić własnej roli"}`

### AC-6: Blokada zdegradowania ostatniego ADMIN
GIVEN: W tabeli `user_roles` istnieje dokładnie 1 rekord z `role = 'ADMIN'` (user_id = `sole-admin`)
AND: Zalogowany ADMIN wysyła request z ważnym JWT (jako ten jedyny admin)
WHEN: Wywołuje `PATCH /api/users/sole-admin/role` z body `{"role": "HELPER_PLUS"}`
THEN: System sprawdza COUNT(*) z `user_roles WHERE role = 'ADMIN'` = 1
AND: Endpoint zwraca HTTP 422 z body `{"error": "Nie można zdegradować ostatniego administratora"}`

### AC-7: Blokada usunięcia siebie i ostatniego ADMIN
GIVEN: Zalogowany ADMIN (user_id = `admin-xyz`) wysyła request
WHEN: Wywołuje `DELETE /api/users/admin-xyz`
THEN: Endpoint zwraca HTTP 422 z body `{"error": "Nie możesz usunąć własnego konta"}`

GIVEN: W tabeli `user_roles` istnieje dokładnie 1 rekord z `role = 'ADMIN'` (user_id = `sole-admin`)
WHEN: Wywołuje `DELETE /api/users/sole-admin` (inny ADMIN próbuje usunąć ostatniego admina)
THEN: Endpoint zwraca HTTP 422 z body `{"error": "Nie można usunąć ostatniego administratora"}`

### AC-8: Walidacja danych wejściowych
GIVEN: Zalogowany ADMIN wysyła request
WHEN: Wywołuje `POST /api/users/invite` z body `{"email": "nieprawidlowyemail", "role": "HELPER"}`
THEN: Endpoint zwraca HTTP 400 z body `{"error": "Nieprawidłowy format adresu email"}`

WHEN: Wywołuje `POST /api/users/invite` z body `{"email": "ok@test.pl", "role": "SUPERADMIN"}`
THEN: Endpoint zwraca HTTP 400 z body `{"error": "Nieprawidłowa rola. Dozwolone: ADMIN, HELPER_PLUS, HELPER"}`

WHEN: Wywołuje `PATCH /api/users/[id]/role` z body `{"role": "DEVELOPER"}`
THEN: Endpoint zwraca HTTP 400 z body `{"error": "Nieprawidłowa rola. Dozwolone: ADMIN, HELPER_PLUS, HELPER"}`

---

## ⚙️ Szczegóły Backend

### Krok 0 — Utwórz plik `src/lib/supabase/admin.ts`

```typescript
// src/lib/supabase/admin.ts
// Klient Supabase z SERVICE_ROLE_KEY — używaj TYLKO w Server Components / Route Handlers
// NIGDY nie importuj tego pliku po stronie klienta (client components)
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables');
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

**WAŻNE**: `SUPABASE_SERVICE_ROLE_KEY` NIE ma prefixu `NEXT_PUBLIC_` — jest dostępny tylko server-side. Nigdy nie eksponuj go do przeglądarki.

### Krok 1 — Utwórz helper `requireAdmin()` w `src/lib/utils/require-admin.ts`

```typescript
// src/lib/utils/require-admin.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export type AdminAuthResult =
  | { success: true; callerId: string }
  | { success: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  // 1. Sprawdź JWT i pobierz user
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Brak autoryzacji. Zaloguj się ponownie.' },
        { status: 401 }
      ),
    };
  }

  const callerId = userData.user.id;

  // 2. Sprawdź rolę w tabeli user_roles
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)
    .single();

  if (roleError || !roleData) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Nie znaleziono profilu użytkownika.' },
        { status: 403 }
      ),
    };
  }

  if (roleData.role !== 'ADMIN') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Brak uprawnień. Wymagana rola: ADMIN' },
        { status: 403 }
      ),
    };
  }

  return { success: true, callerId };
}
```

### Endpoint 1: `POST /api/users/invite`

**Plik**: `src/app/api/users/invite/route.ts`

```
METHOD: POST
Path: /api/users/invite
Auth: Bearer token (Supabase JWT) — wymagane
Role: ADMIN only
Content-Type: application/json
```

**Request Schema:**
```typescript
interface InviteBody {
  email: string  // format email; walidacja: RFC 5322 basic — zawiera "@" i "."
  role: "ADMIN" | "HELPER_PLUS" | "HELPER"  // dokładnie jedna z 3 wartości
}
```

**Response Schema:**
```typescript
// 201 Created — sukces
{ ok: true, userId: string }  // userId = UUID nowego usera z Supabase Auth

// Kody błędów:
// 400 → walidacja inputu (email format / nieprawidłowa rola)
// 401 → brak/wygasły JWT
// 403 → caller nie jest ADMIN
// 409 → email już istnieje w Supabase Auth
// 500 → błąd Supabase (inviteUserByEmail lub INSERT)
```

**Logika biznesowa krok po kroku:**
```
1. Parsuj body: await request.json()
   → TypeError / SyntaxError? zwróć 400 { error: "Nieprawidłowe dane wejściowe" }

2. Waliduj email:
   → brak pola "email" lub pusty string? zwróć 400 { error: "Pole email jest wymagane" }
   → email nie zawiera "@" lub nie ma "." po "@"? zwróć 400 { error: "Nieprawidłowy format adresu email" }

3. Waliduj role:
   → brak pola "role"? zwróć 400 { error: "Pole role jest wymagane" }
   → role nie jest jedną z ['ADMIN','HELPER_PLUS','HELPER']? 
     zwróć 400 { error: "Nieprawidłowa rola. Dozwolone: ADMIN, HELPER_PLUS, HELPER" }

4. Sprawdź autoryzację:
   → const auth = await requireAdmin()
   → if (!auth.success) return auth.response

5. Utwórz admin client:
   → const adminSupabase = createAdminClient()

6. Zaproś użytkownika przez Supabase Auth:
   → const { data: inviteData, error: inviteError } = 
       await adminSupabase.auth.admin.inviteUserByEmail(email)
   → if (inviteError) {
       if (inviteError.message includes "already registered" lub status 422)
         zwróć 409 { error: "Użytkownik z tym adresem email już istnieje" }
       else
         zwróć 500 { error: "Błąd podczas wysyłania zaproszenia" }
     }
   → const newUserId = inviteData.user.id  // UUID string

7. Zapisz rolę do user_roles:
   → const { error: roleError } = await adminSupabase
       .from('user_roles')
       .insert({ user_id: newUserId, role: role })
   → if (roleError) {
       // Rollback: usuń usera z Auth bo nie udało się zapisać roli
       await adminSupabase.auth.admin.deleteUser(newUserId)
       zwróć 500 { error: "Błąd podczas przypisywania roli. Spróbuj ponownie." }
     }

8. Zwróć 201:
   → return NextResponse.json({ ok: true, userId: newUserId }, { status: 201 })
```

---

### Endpoint 2: `PATCH /api/users/[id]/role`

**Plik**: `src/app/api/users/[id]/role/route.ts`

```
METHOD: PATCH
Path: /api/users/[id]/role
Params: id — UUID użytkownika którego rolę zmieniamy
Auth: Bearer token (Supabase JWT) — wymagane
Role: ADMIN only
Content-Type: application/json
```

**Request Schema:**
```typescript
interface RoleUpdateBody {
  role: "ADMIN" | "HELPER_PLUS" | "HELPER"
}
```

**Response Schema:**
```typescript
// 200 OK — sukces
{ ok: true }

// Kody błędów:
// 400 → walidacja inputu
// 401 → brak/wygasły JWT
// 403 → caller nie jest ADMIN
// 404 → user o podanym id nie istnieje w user_roles
// 422 → logika biznesowa: własna rola / ostatni admin
// 500 → błąd DB
```

**Logika biznesowa krok po kroku:**
```
1. Pobierz params.id:
   → const { id } = await params  // Next.js 16: params jest Promise<{id: string}>
   → if (!id lub id pusty string) zwróć 400 { error: "Brak ID użytkownika" }

2. Parsuj body:
   → await request.json()
   → waliduj role: ['ADMIN','HELPER_PLUS','HELPER']
   → błąd? zwróć 400 { error: "Nieprawidłowa rola. Dozwolone: ADMIN, HELPER_PLUS, HELPER" }

3. Sprawdź autoryzację:
   → const auth = await requireAdmin()
   → if (!auth.success) return auth.response
   → callerId = auth.callerId

4. Sprawdź czy caller nie zmienia własnej roli:
   → if (id === callerId)
     zwróć 422 { error: "Nie możesz zmienić własnej roli" }

5. Sprawdź czy target user istnieje w user_roles:
   → używaj server client (ANON KEY — RLS allow ADMIN to read)
   → const { data: targetUser } = await supabase
       .from('user_roles')
       .select('role')
       .eq('user_id', id)
       .single()
   → if (!targetUser) zwróć 404 { error: "Użytkownik nie został znaleziony" }

6. Jeśli nowa rola != 'ADMIN' i target jest aktualnie 'ADMIN':
   → sprawdź czy jest więcej niż 1 ADMIN:
   → const { count } = await supabase
       .from('user_roles')
       .select('*', { count: 'exact', head: true })
       .eq('role', 'ADMIN')
   → if (count <= 1)
     zwróć 422 { error: "Nie można zdegradować ostatniego administratora" }

7. Wykonaj UPDATE:
   → const adminSupabase = createAdminClient()
   → const { error: updateError } = await adminSupabase
       .from('user_roles')
       .update({ role: role })
       .eq('user_id', id)
   → if (updateError) zwróć 500 { error: "Błąd aktualizacji roli" }

8. Zwróć 200:
   → return NextResponse.json({ ok: true }, { status: 200 })
```

---

### Endpoint 3: `DELETE /api/users/[id]`

**Plik**: `src/app/api/users/[id]/route.ts`

```
METHOD: DELETE
Path: /api/users/[id]
Params: id — UUID użytkownika do usunięcia
Auth: Bearer token (Supabase JWT) — wymagane
Role: ADMIN only
```

**Response Schema:**
```typescript
// 200 OK — sukces
{ ok: true }

// Kody błędów:
// 400 → brak id
// 401 → brak/wygasły JWT
// 403 → caller nie jest ADMIN
// 404 → user o podanym id nie istnieje
// 422 → logika biznesowa: usunięcie siebie / ostatniego admina
// 500 → błąd Supabase Auth lub DB
```

**Logika biznesowa krok po kroku:**
```
1. Pobierz params.id:
   → const { id } = await params
   → if (!id) zwróć 400 { error: "Brak ID użytkownika" }

2. Sprawdź autoryzację:
   → const auth = await requireAdmin()
   → if (!auth.success) return auth.response
   → callerId = auth.callerId

3. Sprawdź czy caller nie usuwa samego siebie:
   → if (id === callerId)
     zwróć 422 { error: "Nie możesz usunąć własnego konta" }

4. Sprawdź czy target user istnieje:
   → const { data: targetUser } = await supabase
       .from('user_roles')
       .select('role')
       .eq('user_id', id)
       .single()
   → if (!targetUser) zwróć 404 { error: "Użytkownik nie został znaleziony" }

5. Jeśli target ma rolę ADMIN — sprawdź czy jest jedynym adminem:
   → if (targetUser.role === 'ADMIN') {
       const { count } = await supabase
         .from('user_roles')
         .select('*', { count: 'exact', head: true })
         .eq('role', 'ADMIN')
       if (count <= 1)
         zwróć 422 { error: "Nie można usunąć ostatniego administratora" }
     }

6. Usuń rekord z user_roles (najpierw — FK constraint):
   → const adminSupabase = createAdminClient()
   → const { error: roleDeleteError } = await adminSupabase
       .from('user_roles')
       .delete()
       .eq('user_id', id)
   → if (roleDeleteError) zwróć 500 { error: "Błąd podczas usuwania danych użytkownika" }

7. Usuń użytkownika z Supabase Auth:
   → const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(id)
   → if (authDeleteError) {
       // Auth delete failed — próbuj przywrócić user_roles (best effort):
       // log error — nie rollbackuj user_roles (user nie może się zalogować bez Auth)
       zwróć 500 { error: "Błąd podczas usuwania konta" }
     }

8. Zwróć 200:
   → return NextResponse.json({ ok: true }, { status: 200 })
```

---

## ⚠️ Edge Cases

### EC-1: Email zaproszenia już zarejestrowany w Supabase
Scenariusz: ADMIN zaprasza `angelika@rodzina.pl`, ale ona już ma konto (Supabase Auth zwraca błąd przy inviteUserByEmail)
Oczekiwane zachowanie: Endpoint zwraca 409. NIE tworzy duplikatu w `user_roles`. NIE rzuca unhandled error.
Komunikat: `"Użytkownik z tym adresem email już istnieje"`

### EC-2: Transakcja częściowa — sukces invite, błąd INSERT do user_roles
Scenariusz: `supabase.auth.admin.inviteUserByEmail` zakończył się sukcesem (user_id zwrócony), ale `INSERT INTO user_roles` rzuca błąd (np. problem z siecią lub naruszenie constraint)
Oczekiwane zachowanie: System wykonuje rollback — wywołuje `adminSupabase.auth.admin.deleteUser(newUserId)` żeby nie pozostawić "zombie" usera bez roli. Zwraca 500.
Komunikat: `"Błąd podczas przypisywania roli. Spróbuj ponownie."`

### EC-3: Próba zmiany roli użytkownika który nie ma rekordu w user_roles
Scenariusz: Istnieje user w Supabase Auth ale nie ma wpisu w `user_roles` (edge case po migracji lub bug)
Oczekiwane zachowanie: PATCH zwraca 404.
Komunikat: `"Użytkownik nie został znaleziony"`

### EC-4: Przekazanie nieprawidłowego UUID jako [id]
Scenariusz: `PATCH /api/users/nie-jest-uuid/role` — string który nie jest UUID
Oczekiwane zachowanie: Supabase query `.eq('user_id', 'nie-jest-uuid')` zwróci `null` (brak rekordu). Endpoint zwraca 404. NIE rzuca 500.
Komunikat: `"Użytkownik nie został znaleziony"`

### EC-5: Brak zmiennej SUPABASE_SERVICE_ROLE_KEY w środowisku
Scenariusz: Deployment bez ustawionej zmiennej środowiskowej
Oczekiwane zachowanie: `createAdminClient()` rzuca Error z czytelnym komunikatem. Endpoint zwraca 500.
Logowanie: `console.error('Missing Supabase admin environment variables')` — NIE loguj wartości kluczy.

### EC-6: Brak body w żądaniu POST lub PATCH
Scenariusz: Request z Content-Type: application/json ale pustym body
Oczekiwane zachowanie: `request.json()` rzuca SyntaxError. Endpoint wrappuje to w try/catch i zwraca 400.
Komunikat: `"Nieprawidłowe dane wejściowe"`

---

## 🚫 Out of Scope tej Story
- Strona UI do zarządzania użytkownikami (to jest STORY-3.8 frontend)
- Middleware RBAC dla routingu (to jest STORY-3.3)
- Listing użytkowników / GET endpointy (to jest STORY-3.8 backend part)
- OAuth providers, magic links
- Email templates dla zaproszenia (Supabase zarządza tym automatycznie)
- Rate limiting na endpointach

---

## ✔️ Definition of Done
- [ ] Plik `src/lib/supabase/admin.ts` z `createAdminClient()` utworzony
- [ ] Plik `src/lib/utils/require-admin.ts` z `requireAdmin()` utworzony
- [ ] `POST /api/users/invite` — zwraca 201 `{ok: true, userId}` dla poprawnych danych
- [ ] `POST /api/users/invite` — zwraca 409 gdy email już istnieje
- [ ] `PATCH /api/users/[id]/role` — zwraca 200 `{ok: true}` dla poprawnej zmiany roli
- [ ] `PATCH /api/users/[id]/role` — zwraca 422 gdy caller zmienia własną rolę
- [ ] `PATCH /api/users/[id]/role` — zwraca 422 gdy próba degradacji jedynego ADMIN
- [ ] `DELETE /api/users/[id]` — zwraca 200 `{ok: true}` po usunięciu
- [ ] `DELETE /api/users/[id]` — zwraca 422 gdy caller usuwa siebie
- [ ] `DELETE /api/users/[id]` — zwraca 422 gdy próba usunięcia jedynego ADMIN
- [ ] Wszystkie 3 endpointy zwracają 401 gdy brak JWT
- [ ] Wszystkie 3 endpointy zwracają 403 gdy caller nie jest ADMIN
- [ ] `SUPABASE_SERVICE_ROLE_KEY` używany TYLKO w admin client (nie eksponowany do przeglądarki)
- [ ] Walidacja inputu zwraca 400 z czytelnym komunikatem po polsku
- [ ] Rollback zaimplementowany w POST (EC-2)
- [ ] Kod przechodzi linter bez błędów (`next lint`)
- [ ] Story review przez PO
