---
story_id: STORY-10.2
title: "Settings API — GET/POST /api/settings (per user)"
epic: EPIC-10
module: settings
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-10.1, STORY-3.3]
blocks: [STORY-10.3]
tags: [api, settings, crud, auth, sqlite]
---

## 🎯 User Story

**Jako** zalogowany użytkownik KiraBoard
**Chcę** móc pobrać i zapisać swoje ustawienia przez API
**Żeby** moje preferencje (motyw, język, powiadomienia, auto-refresh) były trwale zachowane i ładowane przy każdym logowaniu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Endpointy Next.js API Routes:
- `GET  /api/settings` → zwraca wszystkie ustawienia zalogowanego usera
- `POST /api/settings` → upsert jednego lub wielu ustawień zalogowanego usera

Pliki: `pages/api/settings/index.ts` (lub `app/api/settings/route.ts`)

### Powiązane pliki
- `db/migrations/010_kb_settings.sql` — tabela `kb_settings` (STORY-10.1)
- `lib/db.ts` — instancja better-sqlite3
- `lib/auth-middleware.ts` — `requireAuth()` middleware (STORY-3.3)
- `_shared/types/settings.ts` — typy TypeScript

### Stan systemu przed tą story
- STORY-10.1: tabela `kb_settings` istnieje z indeksem na `(user_id, key)`
- STORY-3.3: `requireAuth()` middleware weryfikuje JWT i zwraca `user` z `{ id, role }`

---

## ✅ Acceptance Criteria

### AC-1: GET /api/settings zwraca ustawienia zalogowanego użytkownika
GIVEN: użytkownik z `user_id='u1'` jest zalogowany z ważnym JWT i ma 4 rekordy w `kb_settings`
WHEN: wysyła `GET /api/settings` z nagłówkiem `Authorization: Bearer <token>`
THEN: API zwraca 200 z body `{ "data": { "theme": "dark", "language": "pl", "notifications": true, "auto_refresh_interval": 30 } }`
AND: wartości są skonwertowane do właściwych typów JS (boolean dla `notifications`, number dla `auto_refresh_interval`)

### AC-2: POST /api/settings upsertuje ustawienia
GIVEN: użytkownik z `user_id='u1'` jest zalogowany i ma `theme='system'` w bazie
WHEN: wysyła `POST /api/settings` z body `{ "theme": "dark", "language": "en" }`
THEN: API zwraca 200 z body `{ "data": { "theme": "dark", "language": "en", "notifications": true, "auto_refresh_interval": 30 } }`
AND: w tabeli `kb_settings` rekord `(user_id='u1', key='theme')` ma `value='dark'`, a `(user_id='u1', key='language')` ma `value='en'`
AND: pozostałe ustawienia (`notifications`, `auto_refresh_interval`) nie są zmienione

### AC-3: Brak tokenu zwraca 401
GIVEN: żadnego nagłówka Authorization
WHEN: wysyła `GET /api/settings` lub `POST /api/settings`
THEN: API zwraca 401 `{ "error": "Wymagane uwierzytelnienie" }`

### AC-4: Niedozwolony klucz ustawienia jest odrzucany
GIVEN: użytkownik zalogowany
WHEN: wysyła `POST /api/settings` z body `{ "hacked_key": "evil_value" }`
THEN: API zwraca 400 `{ "error": "Niedozwolony klucz ustawienia: hacked_key" }`
AND: baza danych nie zostaje zmodyfikowana

### AC-5: Niedozwolona wartość jest odrzucana
GIVEN: użytkownik zalogowany
WHEN: wysyła `POST /api/settings` z body `{ "theme": "rainbow" }`
THEN: API zwraca 400 `{ "error": "Nieprawidłowa wartość dla 'theme'. Dozwolone: light, dark, system" }`

---

## ⚙️ Szczegóły Backend

### Endpoint 1 — GET /api/settings
```
METHOD: GET
Path: /api/settings
Auth: Bearer JWT (requireAuth middleware)
Role: każdy zalogowany użytkownik (odczyt własnych ustawień)
```

### Endpoint 2 — POST /api/settings
```
METHOD: POST
Path: /api/settings
Auth: Bearer JWT (requireAuth middleware)
Role: każdy zalogowany użytkownik (zmiana własnych ustawień)
```

### Request Schema (POST)

```typescript
// Wszystkie pola opcjonalne — upsert tylko wysłanych kluczy
interface SettingsUpdateBody {
  theme?:                  'light' | 'dark' | 'system'
  language?:               'pl' | 'en'
  notifications?:          boolean
  auto_refresh_interval?:  10 | 30 | 60 | 300
}
```

### Response Schema

```typescript
// 200 OK (GET i POST)
interface SettingsResponse {
  data: {
    theme:                  'light' | 'dark' | 'system'
    language:               'pl' | 'en'
    notifications:          boolean       // string 'true'/'false' → boolean
    auto_refresh_interval:  number        // string '30' → number
  }
}

// 400 Bad Request
{ "error": string }  // opis błędu walidacji

// 401 Unauthorized
{ "error": "Wymagane uwierzytelnienie" }
```

### Walidacja (dozwolone klucze i wartości)

```typescript
const ALLOWED_SETTINGS = {
  theme:                 ['light', 'dark', 'system'],
  language:              ['pl', 'en'],
  notifications:         [true, false],        // przyjmuje też string 'true'/'false'
  auto_refresh_interval: [10, 30, 60, 300],
} as const;
```

### Logika biznesowa — GET /api/settings

```
1. requireAuth() → pobierz user.id z JWT → brak? zwróć 401
2. SELECT key, value FROM kb_settings WHERE user_id = user.id
3. Jeśli brak rekordów → zwróć domyślne wartości (theme:'system', language:'pl', notifications:true, auto_refresh_interval:30)
4. Konwertuj value (TEXT) → właściwy typ JS (boolean, number)
5. Zwróć 200 { data: { theme, language, notifications, auto_refresh_interval } }
```

### Logika biznesowa — POST /api/settings

```
1. requireAuth() → pobierz user.id z JWT → brak? zwróć 401
2. Parsuj body JSON → błąd parsowania? zwróć 400
3. Dla każdego klucza w body:
   a. Czy klucz jest w ALLOWED_SETTINGS? Nie → zwróć 400 z nazwą klucza
   b. Czy wartość jest dozwolona? Nie → zwróć 400 z dozwolonymi wartościami
4. Dla każdego zwalidowanego klucza:
   INSERT OR REPLACE INTO kb_settings (user_id, key, value) VALUES (user.id, key, value::string)
5. Pobierz aktualne ustawienia (jak w GET step 2-4)
6. Zwróć 200 z pełnym obiektem ustawień
```

### Zapytania do bazy

```sql
-- GET: pobierz ustawienia usera
SELECT key, value FROM kb_settings WHERE user_id = ?;

-- POST: upsert konkretnego klucza
INSERT INTO kb_settings (user_id, key, value, updated_at)
VALUES (?, ?, ?, datetime('now'))
ON CONFLICT(user_id, key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
```

---

## ⚠️ Edge Cases

### EC-1: Użytkownik nie ma żadnych ustawień w bazie (nowy user)
Scenariusz: nowy user jeszcze nie ma wpisów w `kb_settings`
Oczekiwane zachowanie: GET zwraca 200 z wartościami domyślnymi `{ theme:'system', language:'pl', notifications:true, auto_refresh_interval:30 }` — nie 404

### EC-2: POST z pustym body `{}`
Scenariusz: POST wysłany bez żadnych kluczy
Oczekiwane zachowanie: API zwraca 200 z aktualnymi ustawieniami bez żadnych zmian (brak błędu — operacja idempotentna)

### EC-3: POST z nieprawidłowym typem wartości (np. `auto_refresh_interval: "trzydziesci"`)
Scenariusz: wartość nie jest liczbą ani nie należy do dozwolonego zestawu
Oczekiwane zachowanie: zwraca 400 `{ "error": "Nieprawidłowa wartość dla 'auto_refresh_interval'. Dozwolone: 10, 30, 60, 300" }`

---

## 🚫 Out of Scope tej Story
- Ustawienia globalne (nie per-user) — to STORY-10.4/10.5 (dashboard presets per rola)
- CRUD użytkowników — to osobna story z EPIC-10 (Users API)
- UI Settings page — to STORY-10.3

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] GET /api/settings zwraca 200 z typami (boolean, number) nie stringami
- [ ] GET bez tokenu zwraca 401
- [ ] POST z niedozwolonym kluczem zwraca 400
- [ ] POST z niedozwoloną wartością zwraca 400
- [ ] POST z pustym body zwraca 200 (brak zmian)
- [ ] Nowy user bez rekordów w kb_settings dostaje domyślne wartości (nie 404)
- [ ] Endpoint nie crashuje na pustej bazie
- [ ] Story review przez PO
