---
story_id: STORY-10.5
title: "Dashboard presets API — GET/POST /api/dashboard/presets"
epic: EPIC-10
module: settings
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-10.4, STORY-3.3]
blocks: [STORY-10.6, STORY-10.7]
tags: [api, dashboard, presets, roles, sqlite]
---

## 🎯 User Story

**Jako** system KiraBoard
**Chcę** mieć API do odczytu i aktualizacji presetów widgetów per rola
**Żeby** frontend mógł ładować właściwy układ dashboardu dla zalogowanego użytkownika i admin mógł edytować presety przez UI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Endpointy Next.js API Routes:
- `GET  /api/dashboard/presets` → lista presetów wszystkich ról (tylko admin)
- `GET  /api/dashboard/presets/me` → preset dla roli zalogowanego użytkownika (każdy user)
- `POST /api/dashboard/presets/:role` → aktualizacja presetu dla roli (tylko admin)

Pliki: `pages/api/dashboard/presets/index.ts`, `pages/api/dashboard/presets/me.ts`, `pages/api/dashboard/presets/[role].ts`

### Powiązane pliki
- `db/migrations/011_kb_dashboard_presets.sql` — tabela `kb_dashboard_presets` (STORY-10.4)
- `lib/db.ts` — instancja better-sqlite3
- `lib/auth-middleware.ts` — `requireAuth()`, `requireRole('admin')` (STORY-3.3)
- `_shared/types/dashboard.ts` — typy `DashboardPreset`, `Widget`

### Stan systemu przed tą story
- STORY-10.4: tabela `kb_dashboard_presets` istnieje z seed data (3 role)
- STORY-3.3: `requireAuth()` i `requireRole()` middleware działają
- JWT zawiera pole `role` (`admin` | `family` | `guest`)

---

## ✅ Acceptance Criteria

### AC-1: GET /api/dashboard/presets/me zwraca preset dla roli zalogowanego usera
GIVEN: użytkownik Angelika (rola `family`) jest zalogowana z ważnym JWT
WHEN: wysyła `GET /api/dashboard/presets/me`
THEN: API zwraca 200 z body `{ "data": { "role": "family", "widgets": [ {"widget_id": "shopping_list", "visible": true, "order": 1}, ... ] } }`
AND: lista widgetów jest posortowana rosnąco po `order`

### AC-2: GET /api/dashboard/presets zwraca wszystkie presety (tylko admin)
GIVEN: Mariusz (rola `admin`) jest zalogowany
WHEN: wysyła `GET /api/dashboard/presets`
THEN: API zwraca 200 z body `{ "data": [ { "role": "admin", "widgets": [...] }, { "role": "family", "widgets": [...] }, { "role": "guest", "widgets": [...] } ] }`

### AC-3: GET /api/dashboard/presets niedostępny dla non-admin
GIVEN: Angelika (rola `family`) jest zalogowana
WHEN: wysyła `GET /api/dashboard/presets`
THEN: API zwraca 403 `{ "error": "Brak uprawnień — wymagana rola admin" }`

### AC-4: POST /api/dashboard/presets/:role aktualizuje preset (tylko admin)
GIVEN: Mariusz (admin) jest zalogowany, rekord `role='family'` istnieje w bazie
WHEN: wysyła `POST /api/dashboard/presets/family` z body `{ "widgets": [ {"widget_id": "weather", "visible": true, "order": 1}, {"widget_id": "calendar", "visible": true, "order": 2} ] }`
THEN: API zwraca 200 z zaktualizowanymi danymi
AND: baza danych ma nowy `widgets_json` dla roli `family`

### AC-5: Brak tokenu zwraca 401
GIVEN: żadnego nagłówka Authorization
WHEN: wysyła GET lub POST na dowolny endpoint presetów
THEN: API zwraca 401 `{ "error": "Wymagane uwierzytelnienie" }`

### AC-6: Fallback na preset guest dla nieznanej roli
GIVEN: user z rolą `moderator` (nieznana rola) jest zalogowany
WHEN: wysyła `GET /api/dashboard/presets/me`
THEN: API zwraca 200 z presetem dla roli `guest` (fallback)
AND: response zawiera pole `"fallback": true`

---

## ⚙️ Szczegóły Backend

### Endpoint 1 — GET /api/dashboard/presets/me
```
METHOD: GET
Path: /api/dashboard/presets/me
Auth: Bearer JWT (requireAuth)
Role: każdy zalogowany użytkownik
```

### Endpoint 2 — GET /api/dashboard/presets
```
METHOD: GET
Path: /api/dashboard/presets
Auth: Bearer JWT (requireAuth + requireRole('admin'))
Role: admin only
```

### Endpoint 3 — POST /api/dashboard/presets/:role
```
METHOD: POST
Path: /api/dashboard/presets/:role  (role: 'admin' | 'family' | 'guest')
Auth: Bearer JWT (requireAuth + requireRole('admin'))
Role: admin only
```

### Request Schema (POST /api/dashboard/presets/:role)

```typescript
interface WidgetConfig {
  widget_id: string   // musi być w KNOWN_WIDGET_IDS
  visible:   boolean
  order:     number   // integer >= 1
}

interface PresetUpdateBody {
  widgets: WidgetConfig[]  // min 1 element, max 20
}
```

### Response Schema

```typescript
// GET /me — 200 OK
interface PresetMeResponse {
  data: {
    role:     string
    widgets:  WidgetConfig[]  // posortowane po order ASC
    fallback: boolean         // true jeśli użyto presetu guest jako fallback
  }
}

// GET /presets (lista) — 200 OK
interface PresetsListResponse {
  data: Array<{
    role:    string
    widgets: WidgetConfig[]
  }>
}

// POST — 200 OK
interface PresetUpdateResponse {
  data: {
    role:    string
    widgets: WidgetConfig[]
  }
}

// Błędy
{ "error": string }
// 400 → widgets array nieprawidłowy / nieznany widget_id / duplikaty order
// 401 → brak tokenu
// 403 → brak uprawnień admin
// 404 → rola :role nie istnieje w KNOWN_ROLES
```

### Walidacja widgetów

```typescript
const KNOWN_ROLES      = ['admin', 'family', 'guest'] as const;
const KNOWN_WIDGET_IDS = [
  'pipeline_status', 'ai_usage', 'system_health',
  'shopping_list', 'calendar', 'weather'
] as const;
```

### Logika biznesowa — GET /api/dashboard/presets/me

```
1. requireAuth() → user.role z JWT → brak? zwróć 401
2. SELECT widgets_json FROM kb_dashboard_presets WHERE role = user.role
3. Brak rekordu? → fallback: SELECT widgets_json WHERE role = 'guest'
4. JSON.parse(widgets_json) → sort po order ASC
5. Zwróć 200 { data: { role, widgets, fallback: (user.role not in KNOWN_ROLES) } }
```

### Logika biznesowa — POST /api/dashboard/presets/:role

```
1. requireAuth() + requireRole('admin') → brak? zwróć 401/403
2. Sprawdź czy :role ∈ KNOWN_ROLES → nie? zwróć 404
3. Parsuj body → sprawdź widgets array:
   a. Każdy widget_id ∈ KNOWN_WIDGET_IDS? Nie → 400 z nazwą nieznanego widget_id
   b. Brak duplikatów order? Tak → 400 "Zduplikowane numery kolejności"
   c. Brak duplikatów widget_id? Tak → 400 "Zduplikowane widget_id"
4. Posortuj widgets po order ASC
5. INSERT OR REPLACE INTO kb_dashboard_presets (role, widgets_json, updated_at)
   VALUES (role, JSON.stringify(widgets), datetime('now'))
6. Zwróć 200 z zaktualizowanym presetem
```

### Zapytania do bazy

```sql
-- GET /me: pobierz preset dla roli
SELECT role, widgets_json FROM kb_dashboard_presets WHERE role = ?;

-- GET /presets: wszystkie presety
SELECT role, widgets_json FROM kb_dashboard_presets ORDER BY role ASC;

-- POST: upsert presetów dla roli
INSERT INTO kb_dashboard_presets (role, widgets_json, updated_at)
VALUES (?, ?, datetime('now'))
ON CONFLICT(role) DO UPDATE SET
  widgets_json = excluded.widgets_json,
  updated_at   = datetime('now');
```

---

## ⚠️ Edge Cases

### EC-1: widgets_json w bazie jest niepoprawnym JSON
Scenariusz: ktoś bezpośrednio edytował bazę i wstawił zepsuty JSON
Oczekiwane zachowanie: JSON.parse() rzuca → API złapie błąd → fallback na seed preset dla tej roli (lub guest) — zwraca 200 z fallback=true, nie 500

### EC-2: POST z pustą tablicą widgets `[]`
Scenariusz: `{ "widgets": [] }`
Oczekiwane zachowanie: zwraca 400 `{ "error": "Lista widgetów nie może być pusta" }`

### EC-3: POST z nieznanym widget_id
Scenariusz: `{ "widgets": [{ "widget_id": "unknown_widget", "visible": true, "order": 1 }] }`
Oczekiwane zachowanie: zwraca 400 `{ "error": "Nieznany widget: unknown_widget" }`

---

## 🚫 Out of Scope tej Story
- Preset editor UI z drag & drop — to STORY-10.6
- Automatyczne ładowanie presetu przy logowaniu — to STORY-10.7
- Presety per użytkownik (customizacja indywidualna) — future feature

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] GET /me zwraca 200 z posortowanymi widgetami
- [ ] GET /me z nieznaną rolą zwraca preset guest z fallback=true
- [ ] GET /presets zwraca 403 dla non-admin
- [ ] POST z nieznanym widget_id zwraca 400
- [ ] POST z pustą listą zwraca 400
- [ ] Brak tokenu zwraca 401
- [ ] JSON.parse błąd → fallback, nie 500
- [ ] Story review przez PO
