---
story_id: STORY-8.4
title: "Patterns search API — full-text search po patterns + anti-patterns"
epic: EPIC-8
module: patterns
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 2h
depends_on: [STORY-8.1]
blocks: []
tags: [search, full-text, api, filtering, query-params]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** wpisać "sqlite" w search input i dostać listę wszystkich patterns i anti-patterns zawierających to słowo
**Żeby** w 3 sekundy znaleźć wszystkie wzorce dotyczące SQLite bez ręcznego przeglądania całej listy

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `GET /api/patterns?q=sqlite` (rozszerzenie endpointu z STORY-8.1)
Plik: `/app/api/patterns/route.ts` (ten sam plik co STORY-8.1)

**Podejście:** Client-side filtering jako primary approach (wystarczy dla ~50-200 wpisów); server-side search jako query param dla zaawansowanego użycia. Priorytet: client-side jest prostsze i wystarczy.

### Powiązane pliki
- `GET /api/patterns` (STORY-8.1) — zwraca pełną listę patterns
- Frontend filter w `PatternsBrowser` (STORY-8.2) — client-side filter używa danych z STORY-8.1

### Stan systemu przed tą story
- STORY-8.1 gotowa: `GET /api/patterns` działa i zwraca `PatternsResponse`
- Dane patterns załadowane — search to filter po już załadowanych danych

---

## ✅ Acceptance Criteria

### AC-1: GET /api/patterns?q= filtruje wyniki server-side
GIVEN: endpoint `GET /api/patterns` jest dostępny z STORY-8.1
WHEN: klient wysyła `GET /api/patterns?q=sqlite`
THEN: endpoint zwraca `200` z `PatternsResponse` gdzie `patterns` i `antiPatterns` zawierają TYLKO wpisy z frazą "sqlite" (case-insensitive) w polach `title` LUB `content` LUB `tags`; pole `meta.query` zawiera użytą frazę; pole `meta.totalPatterns` i `meta.totalAntiPatterns` odzwierciedlają przefiltrowane liczby

### AC-2: Brak query param = brak filtrowania
GIVEN: endpoint `GET /api/patterns` bez `q=` parametru
WHEN: klient wysyła request
THEN: endpoint zwraca pełną listę (backward compatible z STORY-8.1); brak zmian w zachowaniu

### AC-3: Pusta fraza nie filtruje
GIVEN: `q=` jest ustawione ale puste (`?q=`)
WHEN: klient wysyła `GET /api/patterns?q=`
THEN: endpoint traktuje puste `q` jako brak filtra; zwraca pełną listę; nie zwraca błędu

### AC-4: Multi-word search
GIVEN: query param `?q=supabase+migration`
WHEN: klient wysyła request
THEN: filtrowanie szuka fraz "supabase" AND "migration" (każde słowo osobno) LUB całej frazy — implementacja prosta (split by space, każde słowo musi być w title/content/tags); zwraca wpisy spełniające oba warunki

### AC-5: Client-side search input w PatternsBrowser
GIVEN: strona `/patterns` załadowana z danymi
WHEN: użytkownik wpisuje w search input "sqlite" (input w headerze strony)
THEN: lista kart filtruje się natychmiast (client-side, bez API call); wszystkie karty zawierające "sqlite" w tytule lub treści pozostają widoczne; pozostałe ukryte; działanie instantaniczne (onChange, debounce 150ms)

---

## ⚙️ Szczegóły Backend

### Endpoint (rozszerzenie STORY-8.1)
```
METHOD: GET
Path: /api/patterns?q=[search_term]&category=[category]&type=[pattern|anti-pattern]
Auth: Bearer token (Supabase JWT)
Role: admin
```

### Request Schema (Query Params)

```typescript
interface PatternsQueryParams {
  q?: string        // search term, case-insensitive, min 1 znak jeśli podany
  category?: string // filtruj po kategorii H2 (np. "Pipeline", "Skille")
  type?: "pattern" | "anti-pattern" // filtruj po typie
  severity?: "info" | "warning" | "critical" // filtruj po severity
}
```

### Response Schema (rozszerzenie STORY-8.1)

```typescript
// Pole meta rozszerzone o search context
interface PatternsResponse {
  patterns: PatternEntry[]
  antiPatterns: PatternEntry[]
  meta: {
    patternsFile: string
    antiPatternsFile: string
    parsedAt: string
    totalPatterns: number
    totalAntiPatterns: number
    // Nowe pola:
    query?: string            // użyta fraza q, undefined jeśli brak
    categoryFilter?: string   // użyty filter category
    typeFilter?: string       // użyty filter type
  }
}
```

### Logika biznesowa (krok po kroku)

```
1. Sprawdź token JWT → brak? zwróć 401
2. Sprawdź rolę → nie admin? zwróć 403
3. Parsuj query params: q, category, type, severity
4. Załaduj i sparsuj oba pliki .md (identycznie jak STORY-8.1)
5. Zastosuj filtry na wynikach:
   a. Jeśli q podany i niepusty:
      - Podziel q na słowa (split by space, trim)
      - Dla każdego PatternEntry: sprawdź czy WSZYSTKIE słowa występują w title LUB content LUB tags.join(' ') (case-insensitive)
      - Zachowaj tylko pasujące
   b. Jeśli category podany: filtruj po entry.category === category (case-insensitive)
   c. Jeśli type podany: filtruj po entry.type === type
   d. Jeśli severity podany: filtruj po entry.severity === severity
6. Zwróć 200 z przefiltrowanym PatternsResponse + meta z użytymi filtrami
```

### Dodatkowy komponent frontendowy — Search Input w PatternsBrowser

```typescript
// W PatternsBrowser (STORY-8.2 rozszerzenie):
// - Dodaj state: searchTerm: string = ""
// - Input z debounce 150ms onChange
// - Client-side filter: entries.filter(e =>
//     searchTerm === "" ||
//     e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
//   )
// - Search i tag filter działają jednocześnie (AND logic)
```

---

## ⚠️ Edge Cases

### EC-1: Query zawiera znaki specjalne (regex injection)
Scenariusz: użytkownik wpisuje `sqlite.*` lub `[test` — potencjalny regex injection
Oczekiwane zachowanie: NIE używaj regex dla filtrowania; używaj `.includes()` lub `.indexOf()` — proste string matching; znaki specjalne traktowane dosłownie

### EC-2: Query term nie daje wyników
Scenariusz: użytkownik szuka "kubernetes" — fraza nie istnieje w żadnym wpisie
Oczekiwane zachowanie: endpoint zwraca `200` z `{ patterns: [], antiPatterns: [], meta: { ... } }`; brak błędu 404; frontend wyświetla "Brak wyników dla: 'kubernetes'"

### EC-3: Bardzo długi query param
Scenariusz: q=... ma >500 znaków (paste dużego tekstu)
Oczekiwane zachowanie: endpoint zwraca `400` z komunikatem "Fraza wyszukiwania nie może przekraczać 200 znaków"; nie próbuje filtrować

### EC-4: Kombinacja search + tag filter na froncie
Scenariusz: użytkownik ma aktywny tag "Pipeline" i wpisuje "sqlite" w search
Oczekiwane zachowanie: oba filtry działają jednocześnie (AND logic): wynik = entries które mają tag "Pipeline" ORAZ zawierają "sqlite" w treści; client-side filter obsługuje oba warunki

---

## 🚫 Out of Scope tej Story
- Pełny Elasticsearch/Algolia search (prostsze `.includes()` wystarczy)
- Fuzzy search (typo-tolerant) — nie w tej story
- Indeksowanie i caching wyników search — nie potrzebne dla read-only plików .md
- Search autocomplete / suggestions

---

## ✔️ Definition of Done
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem po polsku
- [ ] Endpoint nie crashuje na pustej bazie
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z błędną rolą zwraca 403
- [ ] `GET /api/patterns?q=sqlite` zwraca tylko pasujące wpisy
- [ ] `GET /api/patterns` (bez q) działa identycznie jak przed zmianą (backward compat)
- [ ] Client-side search input w PatternsBrowser filtruje instantanicznie (debounce 150ms)
- [ ] Search i tag filter działają jednocześnie (AND logic)
- [ ] Brak wyników → komunikat "Brak wyników dla: '[fraza]'"
- [ ] Story review przez PO
