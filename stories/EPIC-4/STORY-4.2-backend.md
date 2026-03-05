---
story_id: STORY-4.2
title: "Shopping list API — CRUD endpoints GET/POST/PATCH/DELETE"
epic: EPIC-4
module: home
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-4.1]
blocks: [STORY-4.3, STORY-4.9]
tags: [crud, api, shopping, sqlite, express]
---

## 🎯 User Story

**Jako** zalogowany użytkownik KiraBoard (Angelika, Zuza, Mariusz)
**Chcę** móc dodawać, pobierać, aktualizować i usuwać elementy listy zakupów przez API
**Żeby** Shopping List UI mógł wyświetlać i zarządzać zakupami rodziny

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route handler: `server/routes/home/shopping.js`
Rejestracja w Express: `server/server.cjs` → `app.use('/api/home/shopping', shoppingRouter)`
Baza danych: SQLite `kira.db` → tabela `kb_shopping_items`

### Powiązane pliki
- `server/db/database.js` — better-sqlite3 connection
- `server/middleware/auth.js` — JWT middleware (z STORY-3.3)
- `server/routes/home/shopping.js` — nowy plik

### Stan systemu przed tą story
- STORY-4.1: tabela `kb_shopping_items` istnieje w SQLite
- STORY-0.3: better-sqlite3 skonfigurowane, `db` dostępne
- STORY-3.3: middleware `requireAuth` dostępny, weryfikuje JWT i dołącza `req.user`

---

## ✅ Acceptance Criteria

### AC-1: GET /api/home/shopping — lista aktywnych itemów
GIVEN: Użytkownik z ważnym JWT i rolą `home` lub wyżej jest zalogowany
WHEN: Wysyła `GET /api/home/shopping`
THEN: System zwraca `200` z listą wszystkich items (bought=0 i bought=1) posortowaną: niekupione pierwsze (bought=0 ASC), w ramach grupy po created_at DESC
AND: Response body zawiera `{ data: ShoppingItem[], meta: { total: number } }`
AND: Każdy item zawiera: `id`, `name`, `quantity`, `unit`, `category`, `bought`, `bought_at`, `created_at`

### AC-2: POST /api/home/shopping — dodanie nowego itemu
GIVEN: Użytkownik z ważnym JWT jest zalogowany
WHEN: Wysyła `POST /api/home/shopping` z body `{ name: "Mleko", quantity: 2, unit: "l", category: "nabiał" }`
THEN: System zwraca `201` z nowo utworzonym item
AND: Item zostaje zapisany w `kb_shopping_items` z `bought=0`, `created_by=req.user.id`, `created_at=now()`
AND: UUID jest generowane po stronie serwera (crypto.randomUUID())

### AC-3: PATCH /api/home/shopping/:id — toggle bought
GIVEN: Item `id=abc123` istnieje w bazie z `bought=0`
WHEN: Użytkownik wysyła `PATCH /api/home/shopping/abc123` z body `{ bought: true }`
THEN: System zwraca `200` z zaktualizowanym itemem gdzie `bought=1` i `bought_at` = aktualna data ISO 8601
AND: Gdy `bought: false` → `bought_at` jest ustawiane na NULL

### AC-4: PATCH /api/home/shopping/:id — aktualizacja pól
GIVEN: Item `id=abc123` istnieje w bazie
WHEN: Użytkownik wysyła `PATCH /api/home/shopping/abc123` z body `{ name: "Mleko UHT", quantity: 3, category: "nabiał" }`
THEN: System zwraca `200` z zaktualizowanym itemem — wszystkie podane pola zmienione
AND: Pola niepodane w body pozostają bez zmian

### AC-5: DELETE /api/home/shopping/:id — usunięcie itemu
GIVEN: Item `id=abc123` istnieje w bazie
WHEN: Użytkownik z rolą `home_plus` lub `admin` wysyła `DELETE /api/home/shopping/abc123`
THEN: System zwraca `204 No Content`
AND: Item zostaje usunięty z `kb_shopping_items`

### AC-6: GET /api/home/shopping?category=nabiał — filtrowanie
GIVEN: W bazie są items z różnymi kategoriami
WHEN: Użytkownik wysyła `GET /api/home/shopping?category=nabiał`
THEN: System zwraca `200` tylko z itemami z `category='nabiał'`

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**1. GET /api/home/shopping**
Path: `/api/home/shopping`
Auth: Bearer token (JWT)
Role: `home`, `home_plus`, `admin`
Query params: `category?` (filtr), `bought?` (0|1, filtr)

**2. POST /api/home/shopping**
Path: `/api/home/shopping`
Auth: Bearer token (JWT)
Role: `home`, `home_plus`, `admin`

**3. PATCH /api/home/shopping/:id**
Path: `/api/home/shopping/:id`
Auth: Bearer token (JWT)
Role: `home`, `home_plus`, `admin`

**4. DELETE /api/home/shopping/:id**
Path: `/api/home/shopping/:id`
Auth: Bearer token (JWT)
Role: `home_plus`, `admin` (zwykłe `home` może tylko toggle bought, nie delete)

### Request Schema

```typescript
// POST body
interface CreateShoppingItem {
  name: string      // wymagane, min 1, max 255 znaków
  quantity?: number // opcjonalne, default 1, > 0
  unit?: string     // opcjonalne, default '', max 20 znaków
  category?: string // opcjonalne, default 'inne', musi być w enum
}

// PATCH body
interface UpdateShoppingItem {
  name?: string
  quantity?: number
  unit?: string
  category?: string
  bought?: boolean  // true = kup, false = odznacz
}
```

### Response Schema

```typescript
// ShoppingItem
interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: 'warzywa' | 'mieso' | 'nabiał' | 'chemia' | 'inne' | 'pieczywo' | 'mrozonki'
  bought: boolean
  bought_at: string | null
  created_by: string | null
  created_at: string
}

// GET 200
{ data: ShoppingItem[], meta: { total: number } }

// POST 201, PATCH 200
{ data: ShoppingItem }

// DELETE 204
// (brak body)

// Kody błędów
// 400 → walidacja inputu (brak name, nieprawidłowa category, quantity <= 0)
// 401 → brak lub wygasły JWT
// 403 → rola nie ma uprawnień (np. home próbuje DELETE)
// 404 → item o podanym :id nie istnieje
// 500 → błąd bazy danych
```

### Logika biznesowa

```
GET /api/home/shopping:
1. Sprawdź JWT → brak? 401
2. Sprawdź rolę (home+) → brak? 403
3. Parsuj query params: category, bought
4. SELECT z kb_shopping_items WHERE category=? (jeśli podane) AND bought=? (jeśli podane)
   ORDER BY bought ASC, created_at DESC
5. Zwróć 200 z { data, meta: { total } }

POST /api/home/shopping:
1. Sprawdź JWT → 401
2. Sprawdź rolę → 403
3. Waliduj body: name wymagane, category w enum → błąd? 400
4. Generuj id = crypto.randomUUID()
5. INSERT INTO kb_shopping_items (id, name, quantity, unit, category, bought, created_by, created_at)
6. Zwróć 201 z nowym itemem

PATCH /api/home/shopping/:id:
1. Sprawdź JWT → 401
2. Sprawdź rolę → 403
3. Sprawdź czy item istnieje → 404
4. Waliduj body (category w enum jeśli podane) → 400
5. Jeśli bought=true → ustaw bought_at = now()
   Jeśli bought=false → ustaw bought_at = NULL
6. UPDATE kb_shopping_items SET ... WHERE id=?
7. Zwróć 200 z zaktualizowanym itemem

DELETE /api/home/shopping/:id:
1. Sprawdź JWT → 401
2. Sprawdź rolę (tylko home_plus/admin) → 403
3. Sprawdź czy item istnieje → 404
4. DELETE FROM kb_shopping_items WHERE id=?
5. Zwróć 204
```

### Zapytania do bazy
```
// GET list:
SELECT * FROM kb_shopping_items
  [WHERE category = ?]
  [AND bought = ?]
  ORDER BY bought ASC, created_at DESC

// POST insert + return:
INSERT INTO kb_shopping_items (...) VALUES (...)
SELECT * FROM kb_shopping_items WHERE id = ?

// PATCH update:
UPDATE kb_shopping_items SET name=?, quantity=?, unit=?, category=?, bought=?, bought_at=?
  WHERE id=?
SELECT * FROM kb_shopping_items WHERE id = ?
```

---

## ⚠️ Edge Cases

### EC-1: Usunięcie już kupionego itemu
Scenariusz: Użytkownik z rolą `home_plus` usuwa item z `bought=1`
Oczekiwane zachowanie: Usunięcie przebiega normalnie (204), brak dodatkowych warunków
Komunikat dla użytkownika: (brak — operacja cicha)

### EC-2: PATCH na nieistniejący ID
Scenariusz: `PATCH /api/home/shopping/nonexistent-uuid`
Oczekiwane zachowanie: System zwraca 404
Komunikat dla użytkownika: `{ error: "Produkt nie istnieje" }`

### EC-3: POST z pustą nazwą
Scenariusz: `POST /api/home/shopping` z body `{ name: "", category: "inne" }`
Oczekiwane zachowanie: System zwraca 400
Komunikat dla użytkownika: `{ error: "Nazwa produktu jest wymagana" }`

### EC-4: Rola 'home' próbuje DELETE
Scenariusz: Użytkownik z rolą `home` (np. Zuza) wysyła DELETE
Oczekiwane zachowanie: System zwraca 403
Komunikat dla użytkownika: `{ error: "Brak uprawnień do usunięcia produktu" }`

---

## 🚫 Out of Scope tej Story
- Smart suggestions (auto-suggest z `kb_shopping_history`) — osobny endpoint lub EPIC-0
- Offline cache i sync — logika frontendowa (STORY-4.3)
- Supabase sync — EPIC-0 sync script
- Bulk delete (usuń wszystkie kupione) — EPIC-4 v2

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem po polsku
- [ ] Endpoint nie crashuje na pustej bazie
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z błędną rolą (home → DELETE) zwraca 403
- [ ] Story review przez PO
