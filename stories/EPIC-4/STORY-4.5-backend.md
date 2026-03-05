---
story_id: STORY-4.5
title: "Kanban API — CRUD cards + column reorder"
epic: EPIC-4
module: home
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-4.4]
blocks: [STORY-4.6]
tags: [crud, api, kanban, sqlite, express, reorder]
---

## 🎯 User Story

**Jako** zalogowany użytkownik KiraBoard
**Chcę** móc zarządzać kartami Kanban przez API — dodawać, przenosić między kolumnami i zmieniać kolejność
**Żeby** Kanban board UI mógł persystować drag & drop między sesjami

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route handler: `server/routes/home/kanban.js`
Rejestracja w Express: `server/server.cjs` → `app.use('/api/home/kanban', kanbanRouter)`
Baza danych: SQLite `kira.db` → tabele `kb_kanban_cards`, `kb_kanban_columns`

### Powiązane pliki
- `server/db/database.js` — better-sqlite3 connection
- `server/middleware/auth.js` — JWT middleware (STORY-3.3)
- `server/routes/home/kanban.js` — nowy plik

### Stan systemu przed tą story
- STORY-4.4: tabele `kb_kanban_cards` i `kb_kanban_columns` istnieją z 3 domyślnymi kolumnami
- STORY-3.3: middleware `requireAuth` dostępny
- STORY-0.3: better-sqlite3 działa, transakcje SQLite dostępne

---

## ✅ Acceptance Criteria

### AC-1: GET /api/home/kanban/columns — pobieranie kolumn z kartami
GIVEN: Użytkownik z ważnym JWT jest zalogowany
WHEN: Wysyła `GET /api/home/kanban/columns`
THEN: System zwraca `200` z listą kolumn w kolejności `position ASC`
AND: Każda kolumna zawiera tablicę `cards` posortowanych po `position ASC`
AND: Każda karta zawiera: `id`, `column_id`, `title`, `description`, `assigned_to`, `due_date`, `position`, `created_at`

### AC-2: POST /api/home/kanban/cards — dodanie karty
GIVEN: Użytkownik z ważnym JWT i dowolną rolą `home+` jest zalogowany
WHEN: Wysyła `POST /api/home/kanban/cards` z body `{ title: "Odkurzyć", column_id: "col-todo", due_date: "2026-03-10" }`
THEN: System zwraca `201` z nową kartą
AND: Karta zostaje dodana na końcu kolumny (position = max(position) + 1000 w danej kolumnie)
AND: `created_by` ustawiony na `req.user.id`

### AC-3: PATCH /api/home/kanban/cards/:id — aktualizacja karty (tytuł, opis, assign, due_date)
GIVEN: Karta `id=xyz` istnieje w kolumnie `col-todo`
WHEN: Użytkownik wysyła `PATCH /api/home/kanban/cards/xyz` z body `{ title: "Odkurzyć salon", assigned_to: "user-abc" }`
THEN: System zwraca `200` z zaktualizowaną kartą — `title` i `assigned_to` zmienione
AND: `updated_at` zaktualizowane do now()

### AC-4: PATCH /api/home/kanban/cards/:id/move — przeniesienie karty (drag & drop)
GIVEN: Karta `id=xyz` jest w kolumnie `col-todo`
WHEN: Użytkownik wysyła `PATCH /api/home/kanban/cards/xyz/move` z body `{ column_id: "col-doing", position: 2000 }`
THEN: System zwraca `200` z kartą w nowej kolumnie i nową pozycją
AND: Karta `column_id` = `col-doing`, `position` = 2000

### AC-5: DELETE /api/home/kanban/cards/:id — usunięcie karty
GIVEN: Karta `id=xyz` istnieje, użytkownik ma rolę `home_plus` lub `admin`
WHEN: Wysyła `DELETE /api/home/kanban/cards/xyz`
THEN: System zwraca `204 No Content`
AND: Karta zostaje usunięta z bazy

### AC-6: GET /api/home/kanban/columns — kolumny zawsze w kolejności position
GIVEN: Kolumny mają `position` 0, 1, 2
WHEN: Pobierana jest lista kolumn
THEN: Kolumny zawsze posortowane rosnąco po `position`, karty w kolumnie posortowane po `position ASC`

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**1. GET /api/home/kanban/columns**
Path: `/api/home/kanban/columns`
Auth: Bearer token
Role: `home`, `home_plus`, `admin`

**2. POST /api/home/kanban/cards**
Path: `/api/home/kanban/cards`
Auth: Bearer token
Role: `home`, `home_plus`, `admin`

**3. PATCH /api/home/kanban/cards/:id**
Path: `/api/home/kanban/cards/:id`
Auth: Bearer token
Role: `home`, `home_plus`, `admin`

**4. PATCH /api/home/kanban/cards/:id/move**
Path: `/api/home/kanban/cards/:id/move`
Auth: Bearer token
Role: `home`, `home_plus`, `admin`

**5. DELETE /api/home/kanban/cards/:id**
Path: `/api/home/kanban/cards/:id`
Auth: Bearer token
Role: `home_plus`, `admin`

### Request Schema

```typescript
// POST /cards body
interface CreateCard {
  title: string       // wymagane, min 1, max 500 znaków
  column_id: string   // wymagane, musi istnieć w kb_kanban_columns
  description?: string // opcjonalne, max 2000 znaków
  assigned_to?: string // opcjonalne, user ID
  due_date?: string    // opcjonalne, format 'YYYY-MM-DD'
}

// PATCH /cards/:id body
interface UpdateCard {
  title?: string
  description?: string
  assigned_to?: string | null  // null = odpisz
  due_date?: string | null     // null = usuń datę
}

// PATCH /cards/:id/move body
interface MoveCard {
  column_id: string  // wymagane, cel kolumna
  position: number   // wymagane, nowa pozycja (gap number, np. 1000, 2000)
}
```

### Response Schema

```typescript
// KanbanColumn z kartami
interface KanbanColumn {
  id: string
  title: string
  position: number
  color: string
  cards: KanbanCard[]
}

// KanbanCard
interface KanbanCard {
  id: string
  column_id: string
  title: string
  description: string
  assigned_to: string | null
  due_date: string | null
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// GET /columns → 200: { data: KanbanColumn[] }
// POST /cards → 201: { data: KanbanCard }
// PATCH /cards/:id → 200: { data: KanbanCard }
// PATCH /cards/:id/move → 200: { data: KanbanCard }
// DELETE /cards/:id → 204 (brak body)

// Błędy:
// 400 → walidacja inputu
// 401 → brak JWT
// 403 → brak uprawnień roli
// 404 → karta/kolumna nie istnieje
// 422 → logika (np. column_id nie istnieje przy POST)
```

### Logika biznesowa

```
GET /api/home/kanban/columns:
1. Sprawdź JWT → 401
2. Sprawdź rolę (home+) → 403
3. SELECT * FROM kb_kanban_columns ORDER BY position ASC
4. Dla każdej kolumny: SELECT * FROM kb_kanban_cards WHERE column_id=? ORDER BY position ASC
5. Zwróć 200 z { data: columns[] } (każda kolumna z `cards` array)

POST /api/home/kanban/cards:
1. Sprawdź JWT → 401, rolę → 403
2. Waliduj body: title wymagane, column_id musi istnieć w kb_kanban_columns → 400/422
3. Oblicz position = (SELECT MAX(position) FROM kb_kanban_cards WHERE column_id=?) + 1000
   → jeśli brak kart w kolumnie: position = 1000
4. INSERT INTO kb_kanban_cards (id=uuid, ...) 
5. Zwróć 201 z nową kartą

PATCH /api/home/kanban/cards/:id:
1. Sprawdź JWT → 401, rolę → 403
2. Sprawdź czy karta istnieje → 404
3. Waliduj pola → 400
4. UPDATE kb_kanban_cards SET ..., updated_at=now() WHERE id=?
5. Zwróć 200 z kartą

PATCH /api/home/kanban/cards/:id/move:
1. Sprawdź JWT → 401, rolę → 403
2. Sprawdź czy karta istnieje → 404
3. Sprawdź czy column_id istnieje → 422
4. UPDATE kb_kanban_cards SET column_id=?, position=?, updated_at=now() WHERE id=?
5. Zwróć 200 z kartą

DELETE /api/home/kanban/cards/:id:
1. Sprawdź JWT → 401, rolę (home_plus/admin) → 403
2. Sprawdź czy karta istnieje → 404
3. DELETE FROM kb_kanban_cards WHERE id=?
4. Zwróć 204
```

### Zapytania do bazy
```
// GET columns z kartami (2 queries):
SELECT * FROM kb_kanban_columns ORDER BY position ASC;
SELECT * FROM kb_kanban_cards ORDER BY column_id, position ASC;
// Merge w JS: grupuj karty po column_id

// Position przy dodaniu nowej karty:
SELECT COALESCE(MAX(position), 0) + 1000 AS next_pos
  FROM kb_kanban_cards WHERE column_id = ?;
```

---

## ⚠️ Edge Cases

### EC-1: Przeniesienie karty do nieistniejącej kolumny
Scenariusz: `PATCH /move` z `column_id = 'col-nonexistent'`
Oczekiwane zachowanie: System zwraca 422
Komunikat dla użytkownika: `{ error: "Podana kolumna nie istnieje" }`

### EC-2: Dwie operacje move jednocześnie (race condition)
Scenariusz: Mariusz i Angelika przenoszą tę samą kartę jednocześnie
Oczekiwane zachowanie: Ostatni PATCH wygrywa (last-write-wins). SQLite obsługuje to przez serialized writes. Brak blokady optymistycznej w MVP.

### EC-3: Karta z column_id=NULL (po usunięciu kolumny)
Scenariusz: Kolumna usunięta → karta ma column_id=NULL
Oczekiwane zachowanie: GET /columns nie zwraca takich kart w żadnej kolumnie. Karta jest "orphaned" — nie wyświetlana.

### EC-4: Rola 'home' próbuje DELETE karty
Scenariusz: Zuza (role: home) wysyła DELETE
Oczekiwane zachowanie: 403
Komunikat dla użytkownika: `{ error: "Brak uprawnień do usunięcia zadania" }`

---

## 🚫 Out of Scope tej Story
- Reorder kolumn przez użytkownika (zmiana kolejności To Do/Doing/Done) — poza scope MVP
- Quick-add z date parsing NLP ("Odkurzyć jutro") — logika w STORY-4.6 frontendzie
- Bulk operacje (przenieś wszystkie z Done do Archive) — poza scope
- Notyfikacje WebSocket/SSE przy zmianie karty — EPIC-2

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z komunikatem po polsku
- [ ] Endpoint nie crashuje na pustej bazie (brak kart)
- [ ] Nieautoryzowane wywołanie zwraca 401
- [ ] Rola `home` próbująca DELETE zwraca 403
- [ ] Przeniesienie karty persystuje po reload (GET /columns zwraca kartę w nowej kolumnie)
- [ ] Story review przez PO
