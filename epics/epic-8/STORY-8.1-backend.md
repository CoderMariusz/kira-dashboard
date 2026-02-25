---
story_id: STORY-8.1
title: "GET /api/patterns — parser markdown plików .kira/ do JSON"
epic: EPIC-8
module: dashboard
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: none
blocks: [STORY-8.3, STORY-8.4]
tags: [api, parser, markdown, patterns, lessons]
---

## 🎯 User Story

**Jako** Mariusz (Admin / Architekt)
**Chcę** mieć endpoint `GET /api/patterns` który parsuje pliki `.kira/` do JSON
**Żeby** dashboard mógł wyświetlić bieżące wzorce i lekcje pipeline'u bez żadnej bazy danych

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `app/api/patterns/route.ts`
Projekt: `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`
Bridge API proxy nie jest używane — endpoint czyta pliki lokalnie przez Bridge API lub bezpośrednio przez filesystem.

**Architektura:** Endpoint Next.js wywołuje Bridge przez HTTP proxy (`/api/bridge/[...path]`).
Bridge-side handler: `kira/api/patterns.py` (do stworzenia) — czyta pliki i zwraca JSON.
Alternatywnie (prostsze): Next.js endpoint wywołuje Python subprocess.

**Pliki źródłowe (absolutne ścieżki):**
- `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/patterns.md`
- `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/anti-patterns.md`
- `/Users/mariuszkrawczyk/codermariusz/kira/.kira/LESSONS_LEARNED.md`

### Powiązane pliki
- `app/api/bridge/[...path]/route.ts` — istniejący proxy do Bridge (pattern do naśladowania)
- `.kira/nightclaw/patterns.md` — format: nagłówki `##` = kategoria, linie `- [data] [model?] [domena?] — tekst`
- `.kira/nightclaw/anti-patterns.md` — analogiczny format, wpisy zaczynają się od `NIE`
- `.kira/LESSONS_LEARNED.md` — sekcje `### BUG-XXX: Tytuł`, podsekcje `**What went wrong**`, `**Root cause**`, `**Fix**`, `**Lesson:**`

### Stan systemu przed tą story
- Projekt kira-dashboard istnieje z routingiem Next.js 16
- Pliki `.kira/` istnieją na dysku z danymi

---

## ✅ Acceptance Criteria

### AC-1: Poprawna odpowiedź z danymi ze wszystkich 3 plików
GIVEN: Wszystkie 3 pliki `.kira/` istnieją i mają poprawny format
WHEN: Klient wywołuje `GET /api/patterns`
THEN: Endpoint zwraca 200 z body `{ patterns: PatternCard[], lessons: Lesson[], meta: { total_patterns, total_lessons, sources: string[], generated_at: string } }`
AND: `patterns` zawiera wpisy z obu plików (patterns.md + anti-patterns.md) z poprawnymi typami `PATTERN` / `ANTI_PATTERN`
AND: `lessons` zawiera wpisy z LESSONS_LEARNED.md z poprawnymi severity (`critical` dla BUG-XXX, `warning` dla reszty)

### AC-2: Brakujący plik nie crashuje — zwraca [] dla tej sekcji
GIVEN: Jeden z plików `.kira/` nie istnieje (np. anti-patterns.md)
WHEN: Klient wywołuje `GET /api/patterns`
THEN: Endpoint zwraca 200 (NIE 500)
AND: `patterns` zawiera tylko wpisy z dostępnych plików
AND: `meta.sources` zawiera tylko pliki które udało się odczytać

### AC-3: Parsowanie nagłówków kategorii
GIVEN: Plik patterns.md ma nagłówki `## Pipeline` i `## Skille`
WHEN: Endpoint przetwarza plik
THEN: Każdy PatternCard ma `category` ustawione na nagłówek `##` pod którym się znajduje wpis
AND: Wpisy przed pierwszym nagłówkiem `##` mają `category: "Ogólne"`

### AC-4: Parsowanie pól opcjonalnych z linii patterns.md
GIVEN: Linia formatu `- [2026-02-17] [GLM-5] [frontend] — opis wzorca`
WHEN: Parser przetwarza linię
THEN: PatternCard ma `date: "2026-02-17"`, `model: "GLM-5"`, `domain: "frontend"`, `text: "opis wzorca"`
AND: `tags` są auto-generowane jako unia [model, domain, category].filter(Boolean) — małe litery

### AC-5: Parsowanie sekcji LESSONS_LEARNED.md
GIVEN: Sekcja `### BUG-001: Opis błędu` z podsekcjami `**What went wrong:**`, `**Root cause:**`, `**Fix:**`, `**Lesson:**`
WHEN: Parser przetwarza plik
THEN: Lesson ma `id: "BUG-001"`, `title: "Opis błędu"`, `severity: "critical"`, `body` = treść "What went wrong", `root_cause`, `fix`, `lesson` wypełnione z odpowiednich sekcji

### AC-6: ID jest deterministyczny
GIVEN: Ten sam wpis (ta sama data + tekst)
WHEN: Endpoint jest wywołany wielokrotnie
THEN: Każdy PatternCard i Lesson ma to samo `id` przy każdym wywołaniu (hash SHA256 truncated to 8 chars z `date+text`)

---

## ⚙️ Szczegóły Backend

### Endpoint
```
METHOD: GET
Path: /api/patterns
Auth: requireAuth (401 bez sesji) — dane prywatne pipeline'u
Role: user (każdy zalogowany użytkownik)
```

### Response Schema

```typescript
// 200 OK
interface PatternsResponse {
  patterns: PatternCard[]
  lessons:  Lesson[]
  meta: {
    total_patterns: number
    total_lessons:  number
    sources:        string[]  // pliki które udało się odczytać
    generated_at:   string    // ISO 8601
  }
}

// PatternCard
interface PatternCard {
  id:               string               // SHA256 hash[0:8] z `${date}${text}`
  source:           'patterns.md' | 'anti-patterns.md'
  type:             'PATTERN' | 'ANTI_PATTERN'
  category:         string               // z nagłówka ## w pliku
  date:             string | null        // YYYY-MM-DD
  model:            string | null        // np. "GLM-5", "Kimi K2.5"
  domain:           string | null        // np. "frontend", "backend"
  text:             string               // pełna treść wpisu
  tags:             string[]             // auto: [model, domain, category].filter(Boolean).map(lowercase)
  related_stories:  string[]             // zawsze [] dla wpisów z pliku; wypełniane przez POST
  occurrences:      number               // zawsze 1 dla wpisów z pliku
}

// Lesson
interface Lesson {
  id:         string                            // np. "BUG-001" lub hash
  source:     'LESSONS_LEARNED.md' | 'anti-patterns.md'
  title:      string
  severity:   'info' | 'warning' | 'critical'
  category:   string
  date:       string | null
  body:       string                            // "What went wrong" lub pełny tekst
  root_cause: string | null
  fix:        string | null
  lesson:     string                            // zawsze wymagana
  tags:       string[]
}

// Kody błędów
// 401 → brak sesji
// 500 → nieoczekiwany błąd parsowania (z `error` w body)
```

### Logika biznesowa (krok po kroku)

```
1. Sprawdź auth → brak sesji? zwróć 401
2. Zdefiniuj ścieżki do 3 plików (absolutne, skonfigurowane przez env KIRA_DIR lub hardcoded fallback)
3. Wczytaj patterns.md:
   a. Jeśli plik nie istnieje → patterns_data = [], dodaj do warnings; kontynuuj
   b. Parsuj linia po linii:
      - Linia `## Nazwa` → ustaw aktualną kategorię = "Nazwa"
      - Linia `- [...]` → parsuj wpis za pomocą regex:
        /^- \[(\d{4}-\d{2}-\d{2})\](?:\s*\[([^\]]*)\])?(?:\s*\[([^\]]*)\])?\s*—\s*(.+)$/
      - Wyciągnij: date, model (opcjonalny), domain (opcjonalny), text
      - Utwórz PatternCard z type=PATTERN, source=patterns.md
4. Wczytaj anti-patterns.md → analogicznie, type=ANTI_PATTERN
5. Wczytaj LESSONS_LEARNED.md:
   a. Jeśli plik nie istnieje → lessons_data = []; kontynuuj
   b. Parsuj sekcje ### BUG-XXX / ### LESSON-XXX:
      - Regex: /^### (BUG|LESSON|OBS)-(\d+): (.+)$/
      - ID = np. "BUG-001"; severity: BUG=critical, LESSON=warning, OBS=info
      - Wyciągnij bloki `**What went wrong:**`, `**Root cause:**`, `**Fix:**`, `**Lesson:**`
      - `lesson` = zawartość bloku `**Lesson:**` (WYMAGANA — jeśli brak → użyj tytułu)
6. Generuj id dla każdego wpisu: SHA256(`${date||''}${text}`).slice(0, 8)
7. Zwróć 200 z { patterns, lessons, meta }
```

---

## ⚠️ Edge Cases

### EC-1: Linia bez daty lub modelu
Scenariusz: Wpis `- Parallel wave execution działa` (brak dat i nawiasów)
Oczekiwane zachowanie: Parser wyciąga `text` = pełna linia bez `- `, `date=null`, `model=null`, `domain=null`; nie crashuje

### EC-2: Sekcja BUG bez bloku "Lesson:"
Scenariusz: Plik LESSONS_LEARNED.md ma sekcję BUG bez linii `**Lesson:**`
Oczekiwane zachowanie: `lesson` = tytuł sekcji (fallback); Lesson nadal jest zwracany; NIE jest pomijany

### EC-3: Plik pusty lub z samymi nagłówkami
Scenariusz: patterns.md istnieje ale ma tylko `# Patterns` bez żadnych wpisów
Oczekiwane zachowanie: `patterns = []`, brak błędu, plik jest w `meta.sources`

### EC-4: Kolizja hash ID (bardzo mało prawdopodobna)
Scenariusz: Dwa wpisy z tym samym date+text (duplikaty w pliku)
Oczekiwane zachowanie: Oba są zwracane (hash może się powtórzyć); nie crashuje; client widzi duplikat

---

## 🚫 Out of Scope tej Story
- POST do pliku (STORY-8.2)
- Typy TypeScript po stronie frontend (STORY-8.3)
- Żadnych migracji SQL
- Real-time polling (osobny mechanizm)
- Parsowanie tagów użytkownika (`related_stories` zawsze `[]` z pliku)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów (`next lint`)
- [ ] Endpoint zwraca 200 dla happy path z poprawnymi typami
- [ ] Endpoint zwraca 200 (nie 500) gdy jeden lub więcej plików nie istnieje
- [ ] Nieautoryzowane wywołanie zwraca 401
- [ ] Parser wyciąga poprawnie: date, model, domain, text, category, severity
- [ ] `meta.sources` zawiera tylko faktycznie odczytane pliki
- [ ] Story review przez PO
