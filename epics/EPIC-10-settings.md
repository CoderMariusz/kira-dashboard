---
epic_id: EPIC-10
title: "Settings — Zarządzanie Użytkownikami i Statusem Systemu"
module: settings
status: draft
priority: must
estimated_size: L
risk: medium
---

## 📋 OPIS

EPIC-10 dostarcza dwie chronione sekcje ustawień dostępne wyłącznie dla roli ADMIN: `/settings/users` do zarządzania kontami użytkowników (zaproszenia, zmiana ról, usunięcie dostępu) oraz `/settings/system` z panelem zdrowia infrastruktury (status OpenClaw, Bridge, zamaskowane klucze API, lista cron jobów, przycisk restartu Bridge). Tabela `user_roles` istnieje już z EPIC-3 — ten epic rozbudowuje ją o dodatkowe metadane i implementuje pełny UI.

## 🎯 CEL BIZNESOWY

Mariusz (ADMIN) zarządza dostępem rodziny i monitoruje stan infrastruktury z jednego miejsca — bez konieczności wchodzenia w Supabase Studio ani terminala — w czasie krótszym niż 30 sekund na akcję.

## 👤 PERSONA

**Mariusz (ADMIN)** — jedyny użytkownik z dostępem do sekcji Settings. Zaprasza nowych członków rodziny, przypisuje im role i w razie potrzeby usuwa dostęp. Regularnie sprawdza status Bridge i OpenClaw — szczególnie po deployach lub gdy inne sekcje dashboardu nie odpowiadają. Oczekuje przejrzystego panelu zdrowia systemu bez konieczności interpretowania surowych logów.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- **EPIC-3**: Auth + Multi-User — tabela `user_roles`, Supabase Auth, RBAC middleware, typy `Role`/`Permission`, hook `usePermissions()`
- Supabase projekt musi mieć włączony Supabase Admin API (Service Role Key) — do invite flow
- OpenClaw musi udostępniać endpoint statusu (`GET /api/system/status` lub odpowiednik)
- Bridge musi udostępniać: `/api/health`, `/api/cron`, `/api/system/restart-bridge`

### Blokuje (ten epic odblokowuje):
- Brak bezpośrednich blokerów — Settings to terminal funkcjonalność admina

## 📦 ZAKRES (In Scope)

- **Lista użytkowników** (`/settings/users`) — tabela wszystkich rekordów z `user_roles` wzbogacona o email (join z `auth.users`), badge roli z kolorami per rola, data zaproszenia (`invited_at`)
- **Zmiana roli użytkownika** — dropdown `ADMIN / HELPER_PLUS / HELPER` inline w tabeli; `PATCH /api/users/[id]/role`; zabezpieczenie przed odebraniem roli samemu sobie
- **Usunięcie użytkownika** — przycisk „Usuń dostęp" z potwierdzeniem modalnym; usuwa rekord z `user_roles` (soft revoke — konto Supabase Auth zostaje)
- **Invite nowego użytkownika** — formularz email + rola → `POST /api/users/invite` wywołuje Supabase `admin.inviteUserByEmail()`; magic link wysyłany przez Supabase
- **Status OpenClaw** (`/settings/system`) — wersja, uptime, lista połączonych kanałów (WhatsApp ✅ / Telegram ✅) pobrana z OpenClaw API
- **Status Bridge** — health (UP/DOWN badge), wersja, ostatni błąd (timestamp + krótki komunikat) z `Bridge /api/health`
- **Status kluczy API** — tabela z listą kluczy: nazwa, zamaskowana wartość (`sk_••••••••1234`), status aktywny/wygasły, data wygaśnięcia; BEZ ujawniania pełnych wartości
- **Lista cron jobów** — tabela cron jobów z Bridge `/api/cron`: nazwa, harmonogram (cron expression), ostatnie uruchomienie, status ostatniego runu
- **Przycisk „Restart Bridge"** — `POST /api/system/restart-bridge` z potwierdzeniem modalnym; wyświetla feedback toast (sukces/błąd)

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Pełne usunięcie konta Supabase Auth** — usuwamy tylko z `user_roles` (revoke); twarde usunięcie z `auth.users` wymaga osobnego flow z potwierdzeniem — przyszły epic
- **Edycja wartości kluczy API** — panel pokazuje tylko status i masked preview; zarządzanie kluczami odbywa się poza dashboardem (Supabase Studio / OpenClaw CLI)
- **Logi systemowe w czasie rzeczywistym** — panel systemu pokazuje snapshot stanu; streaming logów (WebSocket) to oddzielna funkcjonalność
- **Dostęp do Settings dla ról HELPER_PLUS / HELPER** — całe `/settings/*` jest wyłącznie dla ADMIN
- **Konfiguracja Bridge przez UI** — restart tak, ale zmiana konfiguracji (bridge.yml) to poza zakresem
- **OAuth / SSO invite flow** — invite tylko przez Supabase magic link (email)

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] HELPER_PLUS lub HELPER wchodzący na `/settings/users` lub `/settings/system` dostają redirect na `/403` lub swój home view — nigdy nie widzą zawartości
- [ ] Mariusz może zaprosić nowego użytkownika podając email i rolę — Supabase wysyła magic link, użytkownik pojawia się na liście z statusem „zaproszony"
- [ ] Zmiana roli w dropdownie zapisuje się w `user_roles` natychmiast i odświeża tabelę bez przeładowania strony
- [ ] Próba usunięcia własnego konta przez ADMIN zwraca błąd z komunikatem „Nie możesz usunąć własnego dostępu"
- [ ] Panel `/settings/system` wyświetla status OpenClaw i Bridge — żaden z widocznych elementów nie ujawnia pełnej wartości klucza API
- [ ] Przycisk „Restart Bridge" po potwierdzeniu wysyła request i wyświetla toast z wynikiem (sukces lub błąd z komunikatem)
- [ ] Wszystkie stany widoku obsłużone: loading skeleton, empty state (brak użytkowników), error state z komunikatem po polsku

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-10.1 | database | Rozszerzenie `user_roles` — metadane zaproszenia | Migracja dodająca kolumny `invited_by` (UUID FK → auth.users) i `invited_at` (timestamptz) do istniejącej tabeli `user_roles` z EPIC-3 |
| STORY-10.2 | auth | Route guard `/settings/*` — dostęp wyłącznie ADMIN | Rozszerzenie middleware Next.js o blokadę `/settings/*` dla ról HELPER_PLUS i HELPER; dodanie RLS policy na `user_roles` dla operacji UPDATE/DELETE |
| STORY-10.3 | backend | User Management API — CRUD użytkowników i invite | Endpointy `GET /api/users`, `PATCH /api/users/[id]/role`, `DELETE /api/users/[id]`, `POST /api/users/invite` z walidacją że caller = ADMIN i ochroną przed auto-usunięciem |
| STORY-10.4 | backend | System Status API — agregacja statusu infrastruktury | Endpointy `GET /api/system/status` (OpenClaw + Bridge), `GET /api/system/api-keys` (masked), `GET /api/system/cron-jobs`, `POST /api/system/restart-bridge` |
| STORY-10.5 | wiring | Typy i serwis dla User Management | Interfejsy `UserWithRole`, `InviteRequest`, `UpdateRoleRequest` oraz `UserService` z funkcjami wywołującymi endpointy z STORY-10.3 |
| STORY-10.6 | wiring | Typy i serwis dla System Status | Interfejsy `SystemStatus`, `BridgeHealth`, `ApiKeyMeta`, `CronJob` oraz `SystemService` z funkcjami wywołującymi endpointy z STORY-10.4 |
| STORY-10.7 | frontend | Widok `/settings/users` — tabela + zarządzanie dostępem | Strona Users Settings z tabelą użytkowników (email, badge roli, data), dropdownem zmiany roli, modalem potwierdzenia usunięcia i formularzem invite nowego użytkownika |
| STORY-10.8 | frontend | Widok `/settings/system` — health panel i restart Bridge | Strona System Settings z kartami statusu OpenClaw/Bridge, tabelą masked API keys, listą cron jobów i przyciskiem „Restart Bridge" z modalem potwierdzenia |

---

## 📝 SZCZEGÓŁY STORIES

---

### STORY-10.1 — database
**Rozszerzenie `user_roles` — metadane zaproszenia**

Tabela `user_roles` (EPIC-3) nie przechowuje kto i kiedy dodał użytkownika. EPIC-10 UI wymaga kolumny `invited_at` do wyświetlenia daty dodania w tabeli użytkowników.

**Migracja SQL (up):**
```sql
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indeks dla FK
CREATE INDEX IF NOT EXISTS idx_user_roles_invited_by ON user_roles(invited_by);

-- Backfill istniejących rekordów (ustawiamy created_at jako invited_at jeśli istnieje)
-- invited_by pozostaje NULL dla istniejących rekordów
```

**Migracja SQL (down):**
```sql
ALTER TABLE user_roles
  DROP COLUMN IF EXISTS invited_by,
  DROP COLUMN IF EXISTS invited_at;
```

**RLS:** Bez zmian — istniejące policies z EPIC-3 pozostają (ADMIN może wszystko, reszta tylko SELECT własnego rekordu).

---

### STORY-10.2 — auth
**Route guard `/settings/*` — dostęp wyłącznie ADMIN**

**Rozszerzenie middleware (`middleware.ts`):**
```typescript
// Dodaj do istniejącej logiki RBAC z EPIC-3:
if (pathname.startsWith('/settings')) {
  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/403', request.url));
  }
}
```

**Nowa RLS policy (uzupełnienie EPIC-3):**
```sql
-- Tylko ADMIN może aktualizować role innych userów
CREATE POLICY "admin_update_roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
    )
  );

-- Tylko ADMIN może usuwać rekordy z user_roles
CREATE POLICY "admin_delete_roles" ON user_roles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
    )
  );
```

**Strona `/app/403/page.tsx`:** prosty komunikat „Brak dostępu — ta sekcja wymaga uprawnień Administratora" z linkiem powrotu.

---

### STORY-10.3 — backend
**User Management API**

Wszystkie endpointy wymagają sesji z rolą `ADMIN` — weryfikacja przez `getServerSession()` + `ROLE_PERMISSIONS.canManageUsers`.

**`GET /api/users`**
- Łączy `user_roles` z `auth.users` (przez Supabase Admin Client)
- Zwraca: `{ users: UserWithRole[] }`
- `UserWithRole`: `{ id, email, role, invited_at, invited_by_email | null }`

**`PATCH /api/users/[id]/role`**
- Body: `{ role: Role }`
- Walidacja: nowa rola ∈ `['ADMIN','HELPER_PLUS','HELPER']`
- Guard: `id !== currentUser.id` — nie można zmienić własnej roli
- Update `user_roles SET role = $role WHERE user_id = $id`
- Zwraca: `{ success: true, user: UserWithRole }`
- Błędy: 400 (invalid role), 403 (brak uprawnień / próba auto-modyfikacji), 404 (user nie istnieje)

**`DELETE /api/users/[id]`**
- Guard: `id !== currentUser.id` — zwraca 400 z `{ error: 'Nie możesz usunąć własnego dostępu' }`
- Usuwa rekord z `user_roles` (Supabase Auth account pozostaje)
- Zwraca: `{ success: true }`
- Błędy: 403, 404

**`POST /api/users/invite`**
- Body: `{ email: string, role: Role }`
- Walidacja: email format (Zod), rola ∈ dozwolone
- Wywołuje: `supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { role } })`
- Po sukcesie: INSERT do `user_roles (user_id, role, invited_by, invited_at)` — ale `user_id` znany dopiero po akcepcie; alternatywnie wstępny rekord po `listUsers` lub hook Supabase `on_user_created`
- [❓WYMAGA WYJAŚNIENIA]: Czy wstawiamy do `user_roles` od razu (z user_id z odpowiedzi invite), czy dopiero po akcepcie magic linka przez webhook `auth.users` insert trigger?
- Zwraca: `{ success: true, message: 'Zaproszenie wysłane na adres email' }`
- Błędy: 400 (nieprawidłowy email / użytkownik już istnieje), 403

---

### STORY-10.4 — backend
**System Status API**

Serwer-side proxy — frontend nigdy nie kontaktuje się bezpośrednio z Bridge/OpenClaw (unikamy CORS i wycieku URL/tokenów).

**`GET /api/system/status`**
- Równolegle pobiera: OpenClaw status + Bridge `/api/health`
- OpenClaw: `GET {OPENCLAW_API_URL}/api/status` (z `Authorization: Bearer ${OPENCLAW_TOKEN}`)
- Bridge: `GET {BRIDGE_URL}/api/health` (z `Authorization: Bearer ${BRIDGE_TOKEN}`)
- Zwraca:
```typescript
{
  openclaw: {
    version: string,
    uptime: number,          // sekundy
    channels: { whatsapp: boolean, telegram: boolean }
  },
  bridge: {
    status: 'UP' | 'DOWN',
    version: string | null,
    lastError: { message: string, timestamp: string } | null
  }
}
```
- Timeout: 5s per zewnętrzny request; jeśli Bridge nie odpowie → `status: 'DOWN'`

**`GET /api/system/api-keys`**
- Pobiera metadane kluczy z `{BRIDGE_URL}/api/api-keys/status` lub ze stałej konfiguracji środowiskowej
- **NIGDY nie zwraca pełnych wartości**
- Format każdego klucza:
```typescript
{
  name: string,               // np. "OpenAI API Key"
  maskedValue: string,        // np. "sk-••••••••••••abcd"
  status: 'active' | 'expired' | 'unknown',
  expiresAt: string | null    // ISO 8601 lub null
}
```

**`GET /api/system/cron-jobs`**
- Proxy do `{BRIDGE_URL}/api/cron`
- Zwraca:
```typescript
{
  jobs: Array<{
    name: string,
    schedule: string,          // cron expression np. "0 9 * * *"
    lastRun: string | null,    // ISO 8601
    lastStatus: 'success' | 'error' | 'running' | 'never'
  }>
}
```

**`POST /api/system/restart-bridge`**
- Proxy do `{BRIDGE_URL}/api/system/restart-bridge` (POST bez body)
- Timeout: 10s
- Zwraca: `{ success: true, message: 'Bridge restart zainicjowany' }`
- Błędy: 503 (Bridge niedostępny), 500 (błąd restartu)
- [❓WYMAGA WYJAŚNIENIA]: Czy `/api/system/restart-bridge` na Bridge jest już zaimplementowany? Potwierdzić endpoint URL i metodę auth.

**Env vars wymagane (`.env.local`):**
```
OPENCLAW_API_URL=
OPENCLAW_TOKEN=
BRIDGE_URL=
BRIDGE_TOKEN=
```

---

### STORY-10.5 — wiring
**Typy i serwis dla User Management**

**Nowe typy w `types/settings.types.ts`:**
```typescript
import type { Role } from './auth.types';

export interface UserWithRole {
  id: string;
  email: string;
  role: Role;
  invited_at: string;          // ISO 8601
  invited_by_email: string | null;
}

export interface InviteUserRequest {
  email: string;
  role: Role;
}

export interface UpdateRoleRequest {
  role: Role;
}

export interface UsersListResponse {
  users: UserWithRole[];
}
```

**Serwis `lib/api/user-service.ts`:**
```typescript
export const UserService = {
  getAll: async (): Promise<UserWithRole[]>
  updateRole: async (userId: string, role: Role): Promise<UserWithRole>
  deleteUser: async (userId: string): Promise<void>
  inviteUser: async (data: InviteUserRequest): Promise<{ message: string }>
};
```

**Mapowanie błędów (po polsku):**
| HTTP | Komunikat |
|------|-----------|
| 400 | „Nieprawidłowy adres email lub rola" |
| 403 | „Nie masz uprawnień do tej operacji" |
| 404 | „Użytkownik nie istnieje" |
| 409 | „Użytkownik z tym adresem już istnieje" |
| 500 | „Błąd serwera — spróbuj ponownie" |

---

### STORY-10.6 — wiring
**Typy i serwis dla System Status**

**Nowe typy w `types/system.types.ts`:**
```typescript
export interface OpenClawStatus {
  version: string;
  uptime: number;
  channels: {
    whatsapp: boolean;
    telegram: boolean;
  };
}

export interface BridgeHealth {
  status: 'UP' | 'DOWN';
  version: string | null;
  lastError: { message: string; timestamp: string } | null;
}

export interface SystemStatusResponse {
  openclaw: OpenClawStatus;
  bridge: BridgeHealth;
}

export interface ApiKeyMeta {
  name: string;
  maskedValue: string;
  status: 'active' | 'expired' | 'unknown';
  expiresAt: string | null;
}

export interface CronJob {
  name: string;
  schedule: string;
  lastRun: string | null;
  lastStatus: 'success' | 'error' | 'running' | 'never';
}
```

**Serwis `lib/api/system-service.ts`:**
```typescript
export const SystemService = {
  getStatus: async (): Promise<SystemStatusResponse>
  getApiKeys: async (): Promise<ApiKeyMeta[]>
  getCronJobs: async (): Promise<CronJob[]>
  restartBridge: async (): Promise<{ message: string }>
};
```

**Mapowanie błędów:**
| HTTP | Komunikat |
|------|-----------|
| 503 | „Bridge jest niedostępny — nie można wykonać operacji" |
| 500 | „Błąd serwera systemu — sprawdź logi" |

---

### STORY-10.7 — frontend
**Widok `/settings/users` — tabela + zarządzanie dostępem**

**Plik:** `app/settings/users/page.tsx`

**Layout:** Sidebar (z EPIC-3) + główna treść z nagłówkiem „Użytkownicy" i przyciskiem „Zaproś użytkownika" (fioletowy, `bg-[#818cf8]`).

**Stany widoku:**

*Loading:* Skeleton tabeli — 3 wiersze z shimmer na tle `#0d0c1a`

*Empty:* Ikona users + tekst „Brak użytkowników. Zaproś pierwszą osobę." + przycisk invite

*Error:* Alert z czerwonym obramowaniem + komunikat z UserService + przycisk „Spróbuj ponownie"

*Filled:* Tabela z kolumnami:

| Email | Rola | Data dodania | Akcje |
|-------|------|--------------|-------|
| user@example.com | `<RoleBadge>` | 15 sty 2026 | `<RoleDropdown>` `<DeleteButton>` |

**Komponenty:**

`RoleBadge` — kolorowe badge per rola:
- ADMIN → `bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/40`
- HELPER_PLUS → `bg-emerald-500/20 text-emerald-400 border border-emerald-500/40`
- HELPER → `bg-slate-500/20 text-slate-400 border border-slate-500/40`

`RoleDropdown` — shadcn `<Select>` z opcjami ADMIN/HELPER_PLUS/HELPER; onChange → `UserService.updateRole()` + toast „Rola zaktualizowana"; zablokowany dla własnego rekordu (current user)

`DeleteButton` — ikona trash; kliknięcie otwiera `<ConfirmModal>`:
- Tytuł: „Usuń dostęp użytkownika"
- Treść: „Czy na pewno chcesz usunąć dostęp dla **{email}**? Konto pozostanie w systemie, ale użytkownik straci dostęp do dashboardu."
- Przyciski: „Anuluj" (szary) / „Usuń dostęp" (czerwony)
- Po potwierdzeniu: `UserService.deleteUser()` + toast + odświeżenie listy

**Modal „Zaproś użytkownika"** — shadcn `<Dialog>`:
- Pole email (input, walidacja Zod: `z.string().email()`)
- Select rola (ADMIN/HELPER_PLUS/HELPER)
- Przycisk „Wyślij zaproszenie" (`bg-[#818cf8]`)
- Po sukcesie: toast „Zaproszenie wysłane na adres {email}" + zamknięcie modalu

**UX flows:**
1. Wejście na stronę → fetch `GET /api/users` → tabela z danymi
2. Dropdown zmiana roli → optimistic update → PATCH → toast sukces/błąd; przy błędzie rollback
3. Klik „Zaproś" → modal → submit → toast + odświeżenie listy
4. Klik trash → modal potwierdzenia → DELETE → toast + usunięcie wiersza z listy

---

### STORY-10.8 — frontend
**Widok `/settings/system` — health panel i restart Bridge**

**Plik:** `app/settings/system/page.tsx`

**Layout:** Sidebar + 4 sekcje w grid: karty statusu (OpenClaw, Bridge), tabela API keys, tabela cron jobs, sekcja akcji systemowych.

**Sekcja 1 — Karty statusu (2-column grid):**

*Karta OpenClaw:*
- Nagłówek: „OpenClaw" + ikona ⚙️
- Wersja: `v{version}`
- Uptime: sformatowany (`{d}d {h}h {m}m` z liczby sekund)
- Kanały: `WhatsApp` + `✅` (zielony) lub `❌` (czerwony), `Telegram` + `✅`/`❌`
- Tło karty: `bg-white/5 border border-white/10 rounded-xl`

*Karta Bridge:*
- Nagłówek: „Bridge" + ikona 🔗
- Status badge: UP (`bg-emerald-500/20 text-emerald-400`) / DOWN (`bg-red-500/20 text-red-400`)
- Wersja lub „—" jeśli null
- Ostatni błąd: jeśli `lastError !== null` — czerwony tekst `{message}` + szara data; jeśli null — „Brak błędów ✓" (zielony)

*Loading obu kart:* Skeleton z pulsującym shimmer

*Error:* `„Nie można pobrać statusu systemu — Bridge może być niedostępny"` z przyciskiem retry

**Sekcja 2 — API Keys:**

Tabela:

| Nazwa | Klucz (masked) | Status | Wygasa |
|-------|---------------|--------|--------|
| OpenAI API Key | `sk-••••••••abcd` | `<StatusBadge>` | 31 gru 2026 |

StatusBadge: active → `bg-emerald-500/20 text-emerald-400`; expired → `bg-red-500/20 text-red-400`; unknown → `bg-slate-500/20 text-slate-400`

Uwaga nad tabelą: „🔒 Pełne wartości kluczy nie są wyświetlane ze względów bezpieczeństwa."

**Sekcja 3 — Cron Jobs:**

Tabela:

| Nazwa | Harmonogram | Ostatnie uruchomienie | Status |
|-------|-------------|----------------------|--------|
| Daily summary | `0 9 * * *` | 19 lut 2026, 09:00 | `<RunStatusBadge>` |

RunStatusBadge: success (zielony), error (czerwony), running (niebieski puls), never (szary „Nie uruchomiono")

Empty state: „Brak zarejestrowanych cron jobów"

**Sekcja 4 — Akcje systemowe:**

Karta z nagłówkiem „Akcje systemowe":

Przycisk `Restart Bridge`:
- Czerwone obramowanie, tekst „🔄 Restart Bridge"
- Kliknięcie → `<ConfirmModal>`:
  - Tytuł: „Restart Bridge"
  - Treść: „Spowoduje to chwilową niedostępność automatycznych odpowiedzi. Czy chcesz kontynuować?"
  - „Anuluj" / „Restart" (czerwony)
- Po potwierdzeniu: loading spinner na przycisku → `SystemService.restartBridge()` → toast „Bridge restart zainicjowany — usługa wróci za chwilę" (sukces) lub toast błędu z komunikatem
- Przycisk zablokowany gdy Bridge ma status `DOWN`

**Responsywność:**
- Mobile (375px): karty statusu w kolumnie, tabele z poziomym scrollem
- Tablet (768px): karty 2-column
- Desktop (1280px): układ jak opisany

**Nawigacja Settings (sidebar / sub-nav):**
Nad treścią sekcji — tabs/breadcrumb łączący `/settings/users` ↔ `/settings/system`:
```
⚙️ Ustawienia  /  [Użytkownicy] [System]
```

---

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | settings |
| Priorytet | Must |
| Szacunek | L (1–2 tygodnie) |
| Ryzyko | Średnie — integracja z Bridge/OpenClaw API może wymagać ustalenia finalnych endpointów i schemy odpowiedzi |
| Domeny | database, auth, backend, wiring, frontend |
| Stack | Next.js 16, Supabase Auth + Admin API, shadcn/ui, Tailwind CSS, TypeScript, Zod |
| DB | Supabase (`user_roles` — rozszerzenie z EPIC-3) |
| Kolory | Tło: `#0d0c1a`, Akcent: `#818cf8` (indigo), Sukces: `emerald-400`, Błąd: `red-400` |
| Uwagi | STORY-10.3 POST /invite ma nierozwiązany [❓]: moment wstawiania do user_roles (od razu vs. po akcepcie). STORY-10.4 restart-bridge wymaga potwierdzenia że endpoint istnieje na Bridge. |
