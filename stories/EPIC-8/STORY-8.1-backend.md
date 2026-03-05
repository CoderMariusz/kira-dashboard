---
story_id: STORY-8.1
title: "Patterns API — parsuj patterns.md + anti-patterns.md z NightClaw"
epic: EPIC-8
module: patterns
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.2]
blocks: [STORY-8.2, STORY-8.4]
tags: [api, filesystem, markdown-parser, nightclaw, read-only]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** żeby backend czytał pliki `patterns.md` i `anti-patterns.md` z repozytorium NightClaw i zwracał je jako strukturyzowany JSON
**Żeby** frontend mógł wyświetlić pełną listę patterns i anti-patterns bez potrzeby ręcznego parsowania Markdown

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/api/patterns` (GET)
Plik: `/app/api/patterns/route.ts`

### Powiązane pliki
- Source files (read-only): `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/patterns.md`
- Source files (read-only): `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/anti-patterns.md`
- Env var: `NIGHTCLAW_DIR` (ścieżka do katalogu `.kira/nightclaw/`)

### Stan systemu przed tą story
- STORY-0.2 (Bridge proxy / file access) musi być gotowa — dostęp do systemu plików przez Next.js API route musi być skonfigurowany
- Env var `NIGHTCLAW_DIR` musi być ustawiona w `.env.local`

---

## ✅ Acceptance Criteria

### AC-1: GET /api/patterns zwraca sparsowane patterns
GIVEN: plik `patterns.md` istnieje w `NIGHTCLAW_DIR` i zawiera wpisy pod nagłówkami H2 (kategorie) i H3 lub jako list items z formatem `[data] [model] [kategoria] — treść`
WHEN: klient wysyła `GET /api/patterns`
THEN: endpoint zwraca `200` z `{ patterns: PatternEntry[], antiPatterns: PatternEntry[] }` gdzie każdy wpis ma: `id` (slug z tytułu lub hash), `title`, `category` (pipeline/skille/komunikacja/devops/ci-cd itp.), `content`, `tags`, `date` (jeśli w treści), `severity` (info/warning/critical), `type` ("pattern" | "anti-pattern")

### AC-2: GET /api/patterns zwraca sparsowane anti-patterns
GIVEN: plik `anti-patterns.md` istnieje w `NIGHTCLAW_DIR`
WHEN: klient wysyła `GET /api/patterns`
THEN: pole `antiPatterns` zawiera wszystkie wpisy z `anti-patterns.md`; każdy wpis ma `severity` mapowany z treści (NIE → warning/critical; daty i model w tytule → info); `occurrence_count` = liczba wystąpień słowa kluczowego w treści (jeśli nie dostępny, domyślnie `1`)

### AC-3: Endpoint obsługuje brak pliku
GIVEN: `NIGHTCLAW_DIR` nie istnieje lub jeden z plików `.md` jest niedostępny
WHEN: klient wysyła `GET /api/patterns`
THEN: endpoint zwraca `200` z pustą tablicą dla brakującego pliku (nie crashuje); do consola loguje warning z dokładną ścieżką pliku

### AC-4: Tagi są ekstrahowane z treści
GIVEN: wpis w patterns.md zawiera słowa kluczowe jak `[sqlite]`, `#auth`, `GLM-5`, nazwy technologii (Supabase, React, Bridge, NightClaw)
WHEN: endpoint parsuje plik
THEN: pole `tags` dla każdego wpisu zawiera wyekstrahowane tagi (min: kategoria nagłówka H2, plus słowa kluczowe w nawiasach kwadratowych)

---

## ⚙️ Szczegóły Backend

### Endpoint
```
METHOD: GET
Path: /api/patterns
Auth: Bearer token (Supabase JWT)
Role: admin
```

### Response Schema

```typescript
interface PatternEntry {
  id: string             // slug lub hash z tytułu, np. "pipeline-glm5-parallel"
  title: string          // treść po myślniku, np. "33 pliki w 4 wave'ach parallel..."
  category: string       // nazwa sekcji H2, np. "Pipeline", "Skille", "DevOps"
  content: string        // pełna treść wpisu (cały bullet point)
  tags: string[]         // wyekstrahowane tagi: [kategoria, modele, technologie]
  date: string | null    // np. "2026-02-17" jeśli w treści, null jeśli brak
  severity: "info" | "warning" | "critical"  // dla patterns: zawsze "info"; dla anti-patterns: "warning" | "critical" na podstawie słów kluczowych (NIE, ZAWSZE, crash)
  type: "pattern" | "anti-pattern"
  occurrenceCount?: number  // tylko dla anti-patterns, domyślnie 1
}

interface PatternsResponse {
  patterns: PatternEntry[]
  antiPatterns: PatternEntry[]
  meta: {
    patternsFile: string      // pełna ścieżka do pliku
    antiPatternsFile: string
    parsedAt: string          // ISO 8601 timestamp
    totalPatterns: number
    totalAntiPatterns: number
  }
}
```

### Logika biznesowa (krok po kroku)

```
1. Sprawdź token JWT → brak? zwróć 401
2. Sprawdź rolę użytkownika → nie admin? zwróć 403
3. Odczytaj NIGHTCLAW_DIR z env → brak? zwróć 500 z komunikatem "NIGHTCLAW_DIR not configured"
4. Załaduj patterns.md (fs.readFile) → błąd? zaloguj warning, użyj pustej tablicy
5. Załaduj anti-patterns.md (fs.readFile) → błąd? zaloguj warning, użyj pustej tablicy
6. Parsuj patterns.md:
   a. Podziel na sekcje po nagłówkach H2 (regex: /^## (.+)/m)
   b. Każda sekcja = kategoria
   c. Wyodrębnij list items (regex: /^- (.+)/m)
   d. Dla każdego item: wyciągnij datę [YYYY-MM-DD], model [NAME], tagi w nawiasach kwadratowych
   e. Zbuduj PatternEntry z type="pattern", severity="info"
7. Parsuj anti-patterns.md analogicznie:
   a. Podziel na sekcje H2
   b. Wyodrębnij list items
   c. Severity: jeśli treść zawiera "NIE" lub "crash" lub "ZAWSZE" → "warning"; jeśli zawiera "deadlock" lub "security" lub "critical" → "critical"; inaczej "info"
8. Zwróć 200 z PatternsResponse
```

---

## ⚠️ Edge Cases

### EC-1: Plik .md z nieprawidłowym formatem
Scenariusz: jeden z plików ma tylko nagłówki H2 bez list items, lub ma inny format (np. paragrafowy zamiast bullet points)
Oczekiwane zachowanie: endpoint parsuje co może, zwraca dostępne wpisy; nie rzuca exception; loguje warning z nazwą sekcji która nie miała itembów

### EC-2: NIGHTCLAW_DIR nie jest ustawiony w .env
Scenariusz: zmienna środowiskowa `NIGHTCLAW_DIR` jest pusta lub undefined
Oczekiwane zachowanie: endpoint zwraca `500` z body `{ error: "NIGHTCLAW_DIR environment variable not configured" }`

### EC-3: Plik .md jest bardzo duży (>1MB)
Scenariusz: patterns.md urósł do bardzo dużego rozmiaru po wielu sesjach NightClaw
Oczekiwane zachowanie: endpoint czyta plik normalnie (Node.js fs obsługuje), brak limitów rozmiaru; response może być duży ale nie crashuje

### EC-4: Nieuprawniony dostęp
Scenariusz: użytkownik z rolą `home` (nie `admin`) wysyła GET /api/patterns
Oczekiwane zachowanie: endpoint zwraca `403 Forbidden`

---

## 🚫 Out of Scope tej Story
- POST /api/patterns/add (dodawanie nowych wpisów) — poza zakresem MVP read-only browsera
- Parsowanie LESSONS_LEARNED.md — osobna story jeśli potrzebna
- Caching wyników parsowania (cache invalidation) — nie w tej story
- Full-text search po stronie serwera — to STORY-8.4

---

## ✔️ Definition of Done
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem po polsku
- [ ] Endpoint nie crashuje na pustej bazie
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z błędną rolą zwraca 403
- [ ] `GET /api/patterns` zwraca sparsowane patterns i anti-patterns z obu plików NightClaw
- [ ] Brakujący plik .md nie crashuje endpointu — zwraca pustą tablicę + log warning
- [ ] Każdy PatternEntry ma: id, title, category, content, tags, date, severity, type
- [ ] Env var `NIGHTCLAW_DIR` jest udokumentowana w `.env.example`
- [ ] Story review przez PO
