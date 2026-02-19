---
story_id: STORY-4.2
title: "Home data API — CRUD endpoints for shopping + tasks"
epic: EPIC-4
module: home
domain: backend
status: ready
difficulty: complex
recommended_model: codex-5.3
ux_reference: none
api_reference: none
priority: must
estimated_effort: 8 h
depends_on: STORY-4.1
blocks: STORY-4.3, STORY-4.4, STORY-4.5
tags: [crud, api, next.js, supabase, zod, shopping, tasks, validation, rls]
---

## 🎯 User Story

**Jako** aplikacja frontendowa kira-dashboard
**Chcę** mieć Next.js API routes dla operacji CRUD na shopping_items i tasks
**Żeby** komponenty Shopping List i Kanban Board mogły zapisywać, odczytywać, aktualizować i usuwać dane — z walidacją inputu i automatycznym filtrowaniem przez RLS Supabase

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Pliki do stworzenia:
```
src/app/api/home/shopping/route.ts          → GET, POST
src/app/api/home/shopping/[id]/route.ts     → PATCH, DELETE
src/app/api/home/tasks/route.ts             → GET, POST
src/app/api/home/tasks/[id]/route.ts        → PATCH, DELETE
```

Stack:
- Next.js 16 App Router (route handlers, nie pages/api)
- Supabase JS client v2 (`@supabase/supabase-js`)
- Zod (`zod`) do walidacji inputu
- TypeScript

### Powiązane pliki
- `src/lib/supabase/server.ts` — funkcja `createClient()` tworząca Supabase server client z cookies (SSR). Ten plik musi istnieć z EPIC-3.
- `src/lib/supabase/client.ts` — browser client (nie używany w API routes)
- Tabele: `shopping_items`, `tasks`, `columns`, `activity_log`, `household_members` — stworzone w STORY-4.1

### Stan systemu przed tą story
- STORY-4.1 ukończony — wszystkie 6 tabel istnieje z RLS
- EPIC-3 ukończony — Supabase Auth działa, `createClient()` z `src/lib/supabase/server.ts` jest dostępne
- Middleware Next.js odświeża sesję (cookie-based JWT) — użytkownicy mogą być zalogowani przez SSR
- Zod jest zainstalowany: `npm list zod` zwraca wersję

### Jak działa auth w API routes
Każdy endpoint:
1. Tworzy Supabase client przez `createClient()` z `src/lib/supabase/server.ts` (czyta cookies z request)
2. Wywołuje `supabase.auth.getUser()` → dostaje zalogowanego usera lub null
3. Jeśli user = null → zwraca 401
4. Wykonuje query przez ten sam client → Supabase automatycznie stosuje RLS (polityki sprawdzają `auth.uid()`)
5. NIE przekazuje service role — każdy query jest wykonywany jako zalogowany user → RLS filtruje automatycznie

---

## ✅ Acceptance Criteria

### AC-1: GET /api/home/shopping zwraca posortowaną listę
GIVEN: user_A jest zalogowany (ważny JWT w cookies) i należy do household_A
AND: household_A ma 3 shopping items: {name: "Mleko", is_bought: false}, {name: "Chleb", is_bought: true}, {name: "Masło", is_bought: false}
WHEN: frontend wysyła `GET /api/home/shopping?household_id=<household_A_id>`
THEN: endpoint zwraca HTTP 200 z JSON body:
```json
{
  "data": [
    {"id": "...", "name": "Masło",  "is_bought": false, ...},
    {"id": "...", "name": "Mleko",  "is_bought": false, ...},
    {"id": "...", "name": "Chleb",  "is_bought": true,  ...}
  ]
}
```
AND: items z `is_bought = false` są PRZED items z `is_bought = true` (sortowanie: `is_bought ASC, created_at ASC`)
AND: items z household_B nie są zwracane (RLS filtruje)

### AC-2: POST /api/home/shopping tworzy item i loguje aktywność
GIVEN: user_A zalogowany, należy do household_A
WHEN: frontend wysyła `POST /api/home/shopping` z body:
```json
{"name": "Jogurt", "category": "Nabiał", "quantity": 2, "unit": "szt", "household_id": "household_A_id"}
```
THEN: endpoint zwraca HTTP 201 z pełnym obiektem shopping_item:
```json
{"id": "new-uuid", "name": "Jogurt", "category": "Nabiał", "quantity": 2, "unit": "szt", "household_id": "...", "is_bought": false, "added_by": "user_A_id", "created_at": "..."}
```
AND: rekord pojawia się w tabeli `shopping_items`
AND: rekord pojawia się w tabeli `activity_log` z `action = 'shopping_added'`, `entity_name = 'Jogurt'`

### AC-3: POST /api/home/shopping waliduje input i odrzuca błędne dane
GIVEN: user_A zalogowany
WHEN: frontend wysyła `POST /api/home/shopping` z body `{"name": "", "quantity": -1}`
THEN: endpoint zwraca HTTP 400 z body:
```json
{"error": "Walidacja nie powiodła się", "fields": {"name": "Nazwa nie może być pusta", "quantity": "Ilość musi być większa niż 0"}}
```
AND: żaden rekord NIE zostaje dodany do bazy

### AC-4: PATCH /api/home/shopping/[id] aktualizuje item
GIVEN: user_A zalogowany, istnieje shopping_item o id='item-uuid' w household_A
WHEN: frontend wysyła `PATCH /api/home/shopping/item-uuid` z body `{"is_bought": true}`
THEN: endpoint zwraca HTTP 200 z zaktualizowanym obiektem (pole `is_bought: true`)
AND: w bazie `is_bought = true`, `bought_at` jest ustawiony (przez trigger z STORY-4.1)

### AC-5: DELETE /api/home/shopping/[id] usuwa item
GIVEN: user_A zalogowany, istnieje shopping_item o id='item-uuid' w household_A
WHEN: frontend wysyła `DELETE /api/home/shopping/item-uuid`
THEN: endpoint zwraca HTTP 204 (No Content, puste body)
AND: rekord nie istnieje już w tabeli `shopping_items`

### AC-6: GET /api/home/tasks zwraca taski zgrupowane per kolumna
GIVEN: user_A zalogowany, household_A ma 2 columns: "Todo" i "Done", i 3 tasks (2 w Todo, 1 w Done)
WHEN: frontend wysyła `GET /api/home/tasks?household_id=<household_A_id>`
THEN: endpoint zwraca HTTP 200 z:
```json
{
  "data": [
    {
      "id": "col-todo-id",
      "name": "Todo",
      "position": 0,
      "tasks": [
        {"id": "task-1", "title": "Kupić mleko", "position": 1000, ...},
        {"id": "task-2", "title": "Posprzątać", "position": 2000, ...}
      ]
    },
    {
      "id": "col-done-id",
      "name": "Done",
      "position": 1,
      "tasks": [
        {"id": "task-3", "title": "Zrobione!", "position": 1000, ...}
      ]
    }
  ]
}
```
AND: kolumny posortowane po `position ASC`, taski w każdej kolumnie posortowane po `position ASC`

### AC-7: Niezalogowany user dostaje 401
GIVEN: request bez JWT (brak cookies, lub wygasły token)
WHEN: `GET /api/home/shopping?household_id=...`
THEN: endpoint zwraca HTTP 401 z `{"error": "Brak autoryzacji — zaloguj się ponownie"}`

### AC-8: PATCH na cudzym rekordzie nie modyfikuje danych
GIVEN: user_B zalogowany, próbuje edytować item z household_A (do którego nie należy)
WHEN: `PATCH /api/home/shopping/<item-z-household-A>`  z body `{"is_bought": true}`
THEN: endpoint zwraca HTTP 404 (item niewidoczny przez RLS — Supabase zwraca 0 rows)
AND: dane w bazie są niezmienione

---

## ⚙️ Szczegóły Backend

### Endpoint 1: GET /api/home/shopping

**Plik:** `src/app/api/home/shopping/route.ts` — eksportuj `GET`

**Method:** GET
**Path:** `/api/home/shopping`
**Query params:** `household_id: string` (wymagany)
**Auth:** JWT via Supabase cookies (server client)

**Request Schema (Zod):**
```typescript
import { z } from 'zod';

const GetShoppingQuerySchema = z.object({
  household_id: z.string().uuid('household_id musi być prawidłowym UUID'),
});
```

**Response Schema (200 OK):**
```typescript
interface GetShoppingResponse {
  data: ShoppingItem[]  // posortowane: is_bought ASC, created_at ASC
}
```

**Logika biznesowa (krok po kroku):**
```
1. Odczytaj URL search params: const url = new URL(request.url); const household_id = url.searchParams.get('household_id')
2. Walidacja Zod: GetShoppingQuerySchema.safeParse({ household_id })
   → błąd? zwróć 400 z komunikatem walidacji
3. Stwórz Supabase server client: const supabase = await createClient()
4. Pobierz zalogowanego usera: const { data: { user } } = await supabase.auth.getUser()
   → user = null? zwróć 401 z {"error": "Brak autoryzacji — zaloguj się ponownie"}
5. Wykonaj query:
   const { data, error } = await supabase
     .from('shopping_items')
     .select('*')
     .eq('household_id', household_id)
     .order('is_bought', { ascending: true })
     .order('created_at', { ascending: true })
   → error? zwróć 500 z {"error": "Błąd serwera — spróbuj ponownie"}
   UWAGA: RLS automatycznie filtruje po household. Jeśli household_id nie należy do usera → wynik pusty [] (nie 403)
6. Zwróć NextResponse.json({ data: data ?? [] }, { status: 200 })
```

---

### Endpoint 2: POST /api/home/shopping

**Plik:** `src/app/api/home/shopping/route.ts` — eksportuj `POST` (w tym samym pliku co GET)

**Method:** POST
**Path:** `/api/home/shopping`
**Body:** JSON

**Request Schema (Zod):**
```typescript
const PostShoppingBodySchema = z.object({
  household_id: z.string().uuid('household_id musi być prawidłowym UUID'),
  name:         z.string().min(1, 'Nazwa nie może być pusta').max(200, 'Nazwa może mieć max 200 znaków').trim(),
  category:     z.string().max(100).default('Inne'),
  quantity:     z.number().int().min(1, 'Ilość musi być większa niż 0').max(9999).default(1),
  unit:         z.string().max(20).nullable().optional(),
});

type PostShoppingBody = z.infer<typeof PostShoppingBodySchema>
```

**Response Schema:**
```typescript
// 201 Created
interface PostShoppingResponse {
  data: ShoppingItem  // nowy rekord
}

// 400 Validation Error
interface ValidationErrorResponse {
  error: string
  fields?: Record<string, string>  // pole → komunikat błędu
}
```

**Logika biznesowa (krok po kroku):**
```
1. Parsuj body: let body; try { body = await request.json() } catch { return 400 "Nieprawidłowy JSON" }
2. Walidacja Zod: const parsed = PostShoppingBodySchema.safeParse(body)
   → !parsed.success?
     Zmapuj błędy Zod na fields object:
     const fields = Object.fromEntries(
       parsed.error.errors.map(e => [e.path.join('.'), e.message])
     )
     Zwróć 400 { error: "Walidacja nie powiodła się", fields }
3. const { household_id, name, category, quantity, unit } = parsed.data
4. Stwórz Supabase server client: const supabase = await createClient()
5. Pobierz zalogowanego usera: const { data: { user } } = await supabase.auth.getUser()
   → user = null? zwróć 401
6. INSERT shopping_item:
   const { data: item, error: insertError } = await supabase
     .from('shopping_items')
     .insert({
       household_id,
       name,
       category,
       quantity,
       unit: unit ?? null,
       added_by: user.id,
       is_bought: false,
     })
     .select()
     .single()
   → insertError? (np. RLS rejection, lub household nie istnieje)
     Sprawdź insertError.code:
     - 'PGRST301' lub '42501' → 403 "Brak dostępu do tego household"
     - inne → 500 "Błąd serwera"
7. INSERT activity_log (NIE blokuj response jeśli to nie powiedzie):
   await supabase
     .from('activity_log')
     .insert({
       household_id,
       actor_id:    user.id,
       actor_name:  user.email ?? 'Nieznany',
       action:      'shopping_added',
       entity_type: 'shopping_item',
       entity_id:   item.id,
       entity_name: name,
       details:     { category, quantity },
     })
   (ignoruj błąd activity_log — nie przerywaj głównej operacji)
8. Zwróć NextResponse.json({ data: item }, { status: 201 })
```

---

### Endpoint 3: PATCH /api/home/shopping/[id]

**Plik:** `src/app/api/home/shopping/[id]/route.ts`

**Method:** PATCH
**Path:** `/api/home/shopping/:id`
**URL param:** `id: string` (UUID)

**Request Schema (Zod):**
```typescript
const PatchShoppingBodySchema = z.object({
  is_bought: z.boolean().optional(),
  name:      z.string().min(1).max(200).trim().optional(),
  quantity:  z.number().int().min(1).max(9999).optional(),
  category:  z.string().max(100).optional(),
  unit:      z.string().max(20).nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Musisz podać przynajmniej jedno pole do aktualizacji' }
)
```

**Logika biznesowa (krok po kroku):**
```
1. Odczytaj URL param: const { id } = params (z Next.js route segment)
   Walidacja: czy id to prawidłowy UUID? Użyj z.string().uuid().safeParse(id)
   → błąd? zwróć 400 "Nieprawidłowe ID"
2. Parsuj body i waliduj przez PatchShoppingBodySchema.safeParse(body)
   → błąd? zwróć 400 z fields
3. Stwórz supabase client, pobierz user (jak w poprzednich)
4. UPDATE:
   const { data: item, error } = await supabase
     .from('shopping_items')
     .update(parsed.data)  // tylko pola przekazane w body
     .eq('id', id)
     .select()
     .single()
   → error? sprawdź:
     - 'PGRST116' (0 rows returned) → 404 "Item nie znaleziony lub brak dostępu"
     - inne → 500
5. Zwróć NextResponse.json({ data: item }, { status: 200 })
```

Uwaga: RLS `shopping_update` policy zapewnia że user może UPDATE tylko swoje household. Supabase zwróci 0 rows jeśli `id` należy do innego household → error code `PGRST116` → aplikacja zwraca 404 (nie 403, bo nie ujawniamy istnienia zasobu).

---

### Endpoint 4: DELETE /api/home/shopping/[id]

**Plik:** `src/app/api/home/shopping/[id]/route.ts` — eksportuj `DELETE` obok `PATCH`

**Method:** DELETE
**Path:** `/api/home/shopping/:id`

**Logika biznesowa (krok po kroku):**
```
1. Waliduj id (UUID)
2. Pobierz user (auth check)
3. DELETE:
   const { error, count } = await supabase
     .from('shopping_items')
     .delete()
     .eq('id', id)
   → error? → 500
   → count === 0? → 404 "Item nie znaleziony lub brak dostępu"
4. Zwróć new NextResponse(null, { status: 204 })
```

---

### Endpoint 5: GET /api/home/tasks

**Plik:** `src/app/api/home/tasks/route.ts`

**Method:** GET
**Path:** `/api/home/tasks`
**Query params:** `household_id: string` (wymagany)

**Request Schema (Zod):**
```typescript
const GetTasksQuerySchema = z.object({
  household_id: z.string().uuid(),
})
```

**Response Schema (200 OK):**
```typescript
interface ColumnWithTasks {
  id:       string
  name:     string
  position: number
  tasks:    Task[]  // posortowane po position ASC
}

interface GetTasksResponse {
  data: ColumnWithTasks[]  // posortowane po position ASC
}
```

**Logika biznesowa (krok po kroku):**
```
1. Parsuj i waliduj household_id z query params
2. Auth check (getUser)
3. Pobierz columns z taskami — jedno zapytanie z JOIN:
   const { data: columns, error } = await supabase
     .from('columns')
     .select(`
       id,
       name,
       position,
       tasks (
         id,
         title,
         description,
         priority,
         position,
         assigned_to,
         due_date,
         completed_at,
         created_by,
         created_at,
         updated_at
       )
     `)
     .eq('household_id', household_id)
     .order('position', { ascending: true })
     .order('position', { ascending: true, referencedTable: 'tasks' })

   → error? → 500
4. Dla każdej kolumny: upewnij się że tasks jest tablicą (nie null)
   const normalized = (columns ?? []).map(col => ({
     ...col,
     tasks: col.tasks ?? [],
   }))
5. Zwróć NextResponse.json({ data: normalized }, { status: 200 })
```

---

### Endpoint 6: POST /api/home/tasks

**Plik:** `src/app/api/home/tasks/route.ts` — eksportuj `POST`

**Method:** POST
**Path:** `/api/home/tasks`

**Request Schema (Zod):**
```typescript
const PostTaskBodySchema = z.object({
  household_id: z.string().uuid(),
  column_id:    z.string().uuid('column_id musi być prawidłowym UUID'),
  title:        z.string().min(1, 'Tytuł nie może być pusty').max(500).trim(),
  description:  z.string().max(2000).optional(),
  priority:     z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to:  z.string().uuid().nullable().optional(),
  due_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format daty: YYYY-MM-DD').nullable().optional(),
})
```

**Logika biznesowa (krok po kroku):**
```
1. Parsuj body, waliduj przez PostTaskBodySchema
2. Auth check
3. Oblicz pozycję dla nowego taska (append na końcu kolumny):
   const { data: lastTask } = await supabase
     .from('tasks')
     .select('position')
     .eq('column_id', parsed.data.column_id)
     .order('position', { ascending: false })
     .limit(1)
     .single()
   const nextPosition = (lastTask?.position ?? 0) + 1000

4. INSERT task:
   const { data: task, error } = await supabase
     .from('tasks')
     .insert({
       household_id: parsed.data.household_id,
       column_id:    parsed.data.column_id,
       title:        parsed.data.title,
       description:  parsed.data.description,
       priority:     parsed.data.priority,
       assigned_to:  parsed.data.assigned_to ?? null,
       due_date:     parsed.data.due_date ?? null,
       created_by:   user.id,
       position:     nextPosition,
     })
     .select()
     .single()
   → error? → 500

5. INSERT activity_log (fire and forget):
   await supabase.from('activity_log').insert({
     household_id: parsed.data.household_id,
     actor_id:     user.id,
     actor_name:   user.email ?? 'Nieznany',
     action:       'task_created',
     entity_type:  'task',
     entity_id:    task.id,
     entity_name:  parsed.data.title,
     details:      { column_id: parsed.data.column_id, priority: parsed.data.priority },
   })

6. Zwróć NextResponse.json({ data: task }, { status: 201 })
```

---

### Endpoint 7: PATCH /api/home/tasks/[id]

**Plik:** `src/app/api/home/tasks/[id]/route.ts`

**Method:** PATCH
**Path:** `/api/home/tasks/:id`

**Request Schema (Zod):**
```typescript
const PatchTaskBodySchema = z.object({
  column_id:    z.string().uuid().optional(),
  title:        z.string().min(1).max(500).trim().optional(),
  description:  z.string().max(2000).nullable().optional(),
  priority:     z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  position:     z.number().int().min(0).optional(),
  assigned_to:  z.string().uuid().nullable().optional(),
  due_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Podaj przynajmniej jedno pole'
})
```

Logika taka sama jak PATCH shopping (walidacja id, auth, update .eq('id', id), 404 jeśli 0 rows).

Specjalny przypadek dla `moveTask` (drag & drop): frontend wysyła `{ column_id, position }` — endpoint aktualizuje oba pola naraz. Logika pozycjonowania (rebalance) NIE jest w tym endpoincie — zarządza nią hook (STORY-4.3).

Specjalny przypadek `task_moved` activity log: jeśli `column_id` jest w body:
```typescript
await supabase.from('activity_log').insert({
  action:  'task_moved',
  details: { to_column_id: parsed.data.column_id },
  ...
})
```

---

### Endpoint 8: DELETE /api/home/tasks/[id]

**Plik:** `src/app/api/home/tasks/[id]/route.ts` — eksportuj `DELETE`

Logika identyczna do DELETE shopping — waliduj id, auth, delete .eq('id', id), sprawdź count > 0, zwróć 204.

---

### Kody błędów i kiedy je zwracamy

| Kod | Kiedy |
|-----|-------|
| 400 | Walidacja Zod nie przeszła (brakujące/nieprawidłowe pola) |
| 401 | `supabase.auth.getUser()` zwróciło null (brak/wygasły JWT) |
| 404 | Supabase update/delete zwróciło 0 rows (item nie istnieje lub RLS ukrywa) |
| 500 | Nieoczekiwany błąd Supabase lub wyjątek JS |

Uwaga: **403 nie jest używane** — jeśli user nie ma dostępu do household, RLS zwraca pusty wynik (jak 404), co nie ujawnia istnienia zasobu.

---

### Struktura pliku route.ts (wzór dla GET + POST w jednym pliku)

```typescript
// src/app/api/home/shopping/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// --- Zod schemas ---
const GetShoppingQuerySchema = z.object({ household_id: z.string().uuid() })
const PostShoppingBodySchema = z.object({ /* ... */ })

// --- GET handler ---
export async function GET(request: NextRequest) {
  try {
    // walidacja → auth → query → response
  } catch (err) {
    console.error('[GET /api/home/shopping]', err)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// --- POST handler ---
export async function POST(request: NextRequest) {
  try {
    // walidacja → auth → insert → activity_log → response
  } catch (err) {
    console.error('[POST /api/home/shopping]', err)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
```

Każdy handler musi mieć try/catch na najwyższym poziomie — niekontrolowane wyjątki zwracają 500.

---

## ⚠️ Edge Cases

### EC-1: Równoległy PATCH od dwóch użytkowników (race condition)
Scenariusz: Angelika i Mariusz jednocześnie oznaczają ten sam item jako kupiony (`PATCH {is_bought: true}`)
Oczekiwane zachowanie: Oba requesty trafią do bazy. Postgres przetworzy je serialnie (transakcje row-level). Ostatni UPDATE wygrywa. Wynik: item jest oznaczony jako kupiony — oba requesty zwróciły 200. Brak corrupted state.
Implementacja: Supabase/Postgres obsługuje to automatycznie — brak dodatkowego kodu.

### EC-2: household_id w body niezgodny z household usera
Scenariusz: user_B (należy do household_B) wysyła `POST /api/home/shopping` z `household_id = household_A_id`
Oczekiwane zachowanie: RLS policy `shopping_insert` odrzuca INSERT (household_A nie jest w `get_my_household_ids()` dla user_B). Supabase zwraca error z kodem `42501` (RLS violation) lub 0 rows. Endpoint zwraca 403 lub (preferowany) 400 "Brak dostępu do wskazanego household".
Implementacja: Po INSERT sprawdź czy error.code to RLS rejection → zwróć 403.

### EC-3: Pusty column_id — task tworzony do nieistniejącej kolumny
Scenariusz: Frontend wysyła `POST /api/home/tasks` z `column_id` który nie istnieje (błędny UUID lub stara kolumna)
Oczekiwane zachowanie: FK constraint `tasks.column_id REFERENCES columns(id)` odrzuca INSERT. Supabase zwraca error z kodem `23503` (FK violation). Endpoint zwraca 400 "Wskazana kolumna nie istnieje".
Implementacja: Sprawdź error.code === '23503' → zwróć 400 z czytelnym komunikatem.

### EC-4: Zbyt długi name/title (XSS prevention)
Scenariusz: Atakujący wysyła name = `<script>alert('xss')</script>` × 1000 znaków
Oczekiwane zachowanie: Zod `.max(200)` odcina request na poziomie walidacji (400). Dane nigdy nie trafiają do bazy.
Implementacja: Zod `.trim().max(200)` wystarczy — Next.js API route nie renderuje HTML, więc XSS w JSON nie jest bezpośrednim zagrożeniem, ale sanityzacja przez max-length jest dobra praktyką.

### EC-5: Brak household_id w query params GET
Scenariusz: Frontend wysyła `GET /api/home/shopping` bez `?household_id=`
Oczekiwane zachowanie: Zod waliduje i zwraca 400 "household_id musi być prawidłowym UUID"
Implementacja: `url.searchParams.get('household_id')` zwróci null → Zod `.uuid()` odrzuci null → 400.

---

## 🚫 Out of Scope tej Story
- Endpointy dla Activity Feed (read-only feed — obsługiwane przez hook w STORY-4.3)
- Endpointy dla Household Management (invite, join) — STORY-4.7
- Paginacja w GET shopping/tasks — v1 pobiera all items (household nie ma setek tysięcy)
- Wyszukiwanie / filtrowanie po kategorii w API — zrobi to hook po stronie klienta
- Batch operacje (np. "oznacz wszystkie jako kupione") — osobna story jeśli potrzebna
- Rate limiting — obsługiwany przez Vercel/Supabase na poziomie infrastruktury

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 pliki route.ts istnieją i eksportują właściwe handlery (GET, POST, PATCH, DELETE)
- [ ] Każdy endpoint zwraca poprawne kody HTTP dla każdego scenariusza
- [ ] Walidacja Zod odrzuca brakujące/nieprawidłowe dane z komunikatem po polsku
- [ ] Nieautoryzowane wywołanie (bez cookies JWT) zwraca 401
- [ ] RLS działa: request do cudzego household zwraca 404 (nie 403, nie dane)
- [ ] POST shopping i POST tasks logują aktywność do activity_log
- [ ] Endpoint nie crashuje na pustej bazie (empty array zamiast 500)
- [ ] Każdy handler ma try/catch na najwyższym poziomie
- [ ] TypeScript — brak `any`, wszystkie typy zdefiniowane
- [ ] Kod przechodzi `next build` bez błędów TypeScript
- [ ] Kod przechodzi linter (eslint) bez błędów
- [ ] Story review przez PO
