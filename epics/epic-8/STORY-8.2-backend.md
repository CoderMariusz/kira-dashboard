---
story_id: STORY-8.2
title: "POST /api/patterns i POST /api/lessons — dołączanie wpisów do plików .kira/"
epic: EPIC-8
module: dashboard
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-8.1]
blocks: [STORY-8.7]
tags: [api, file-write, patterns, lessons, append]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** móc dodać nowy wzorzec lub lekcję przez API
**Żeby** nie musieć otwierać edytora tekstu — wpis trafia bezpośrednio do pliku `.kira/` w odpowiednim formacie markdown

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Routes:
- `app/api/patterns/route.ts` — rozszerzenie o handler POST (obok GET z STORY-8.1)
- `app/api/lessons/route.ts` — nowy plik

Projekt: `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`

### Pliki docelowe (zapis)
- Patterns: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/patterns.md` (type=PATTERN)
- Anti-patterns: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/anti-patterns.md` (type=ANTI_PATTERN)
- Lessons: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/LESSONS_LEARNED.md`

### Format wpisu patterns.md / anti-patterns.md

```markdown
- [YYYY-MM-DD] [Model?] [domain?] — tekst wpisu
  Related: STORY-X.Y, STORY-X.Z
```

Jeśli `model` lub `domain` jest null → pomiń nawiasy dla tego pola.
`Related:` linia tylko jeśli `related_stories` nie jest puste.
Wpis dołączany na końcu pliku (lub na końcu sekcji `## {category}` jeśli kategoria istnieje w pliku).

### Format wpisu LESSONS_LEARNED.md

```markdown
### {id}: {title}

**Severity:** {severity}
**Tags:** {tags.join(', ')}
**Date:** {date}

{body}

**Root cause:** {root_cause || 'TBD'}

**Fix:** {fix || 'TBD'}

**Lesson:** {lesson}

---
```

### Stan systemu przed tą story
- STORY-8.1 zaimplementowana (typy PatternCard i Lesson istnieją lub są zdefiniowane inline)
- Pliki `.kira/` istnieją na dysku

---

## ✅ Acceptance Criteria

### AC-1: POST /api/patterns — dołącza PATTERN do patterns.md
GIVEN: Zalogowany admin wysyła `POST /api/patterns` z body `{ type: "PATTERN", category: "Pipeline", text: "Kimi działa świetnie na medium tasks", model: "Kimi K2.5", domain: "backend", date: "2026-02-25", related_stories: ["STORY-8.1"] }`
WHEN: Request dociera do endpointu
THEN: Endpoint zwraca 201 z `{ success: true, entry: string }` gdzie `entry` to wygenerowana linia markdown
AND: Plik `.kira/nightclaw/patterns.md` zawiera nowy wpis w formacie `- [2026-02-25] [Kimi K2.5] [backend] — Kimi działa świetnie na medium tasks`
AND: Pod wpisem jest linia `  Related: STORY-8.1`

### AC-2: POST /api/patterns — dołącza ANTI_PATTERN do anti-patterns.md
GIVEN: Body z `{ type: "ANTI_PATTERN", text: "NIE używaj GLM na complex backend tasks", ... }`
WHEN: Request dociera do endpointu
THEN: Wpis trafia do `.kira/nightclaw/anti-patterns.md` (NIE do patterns.md)
AND: Zwraca 201

### AC-3: POST /api/lessons — dołącza nową lekcję do LESSONS_LEARNED.md
GIVEN: Zalogowany admin wysyła `POST /api/lessons` z body `{ id: "BUG-004", title: "Review agent nie pushuje", severity: "critical", category: "Pipeline", body: "...", root_cause: "...", fix: "...", lesson: "...", tags: ["pipeline", "git"], date: "2026-02-25" }`
WHEN: Request dociera do endpointu
THEN: Endpoint zwraca 201
AND: Plik `.kira/LESSONS_LEARNED.md` zawiera nową sekcję `### BUG-004: Review agent nie pushuje` z wszystkimi polami w formacie markdown

### AC-4: Walidacja — brakujące wymagane pola zwracają 400
GIVEN: Body POST /api/patterns bez pola `text`
WHEN: Request dociera do endpointu
THEN: Endpoint zwraca 400 z `{ error: "Pole 'text' jest wymagane" }`
AND: Plik NIE jest modyfikowany

### AC-5: Auth — niezalogowany użytkownik dostaje 401
GIVEN: Wywołanie bez sesji
WHEN: POST /api/patterns lub POST /api/lessons
THEN: 401, plik NIE jest modyfikowany

---

## ⚙️ Szczegóły Backend

### Endpoint POST /api/patterns

```
METHOD: POST
Path: /api/patterns
Auth: requireAdmin (401 bez sesji, 403 bez roli admin)
```

```typescript
// Request Body
interface PostPatternBody {
  type:             'PATTERN' | 'ANTI_PATTERN'  // wymagane
  category:         string                        // wymagane, max 50 znaków
  text:             string                        // wymagane, min 3, max 500 znaków
  model?:           string                        // opcjonalne, np. "GLM-5"
  domain?:          string                        // opcjonalne, np. "frontend"
  date?:            string                        // opcjonalne, YYYY-MM-DD; default: today
  related_stories?: string[]                      // opcjonalne, max 10 elementów
}

// Response 201
interface PostPatternResponse {
  success: true
  entry:   string  // wygenerowana linia markdown
}
```

### Endpoint POST /api/lessons

```
METHOD: POST
Path: /api/lessons
Auth: requireAdmin
```

```typescript
// Request Body
interface PostLessonBody {
  id:          string                         // wymagane, np. "BUG-004"
  title:       string                         // wymagane, min 3, max 200 znaków
  severity:    'info' | 'warning' | 'critical'  // wymagane
  category:    string                         // wymagane
  body:        string                         // wymagane, "What went wrong"
  root_cause?: string                         // opcjonalne
  fix?:        string                         // opcjonalne
  lesson:      string                         // wymagane, min 10 znaków
  tags?:       string[]                       // opcjonalne
  date?:       string                         // opcjonalne, YYYY-MM-DD; default: today
}
```

### Logika biznesowa POST /api/patterns

```
1. requireAdmin → 401/403 jeśli brak
2. Waliduj body: type, category, text wymagane → 400 jeśli brak
3. Generuj date = body.date ?? new Date().toISOString().split('T')[0]
4. Wybierz plik docelowy: type=PATTERN → patterns.md; ANTI_PATTERN → anti-patterns.md
5. Zbuduj linię markdown:
   `- [${date}]${model ? ` [${model}]` : ''}${domain ? ` [${domain}]` : ''} — ${text}`
6. Jeśli related_stories nie jest puste → dodaj `  Related: ${related_stories.join(', ')}`
7. Otwórz plik (fs.appendFile lub fs.readFile → append → writeFile):
   a. Szukaj sekcji `## ${category}` w pliku
   b. Jeśli sekcja istnieje → wstaw wpis na końcu sekcji (przed kolejnym `##` lub końcem pliku)
   c. Jeśli sekcja nie istnieje → append na końcu pliku: `\n## ${category}\n${linia}`
8. Zwróć 201 { success: true, entry: linia }
```

### Logika biznesowa POST /api/lessons

```
1. requireAdmin → 401/403
2. Waliduj: id, title, severity, category, body, lesson wymagane → 400
3. Generuj date = body.date ?? today
4. Zbuduj blok markdown (format z sekcji Kontekst)
5. Append do LESSONS_LEARNED.md (fs.appendFile — zawsze na końcu, nie szukamy sekcji)
6. Zwróć 201 { success: true }
```

---

## ⚠️ Edge Cases

### EC-1: Plik docelowy nie istnieje
Scenariusz: `.kira/nightclaw/patterns.md` został usunięty
Oczekiwane zachowanie: Endpoint tworzy plik z nagłówkiem `# Patterns — Co działa ✅\n\n## {category}\n{linia}` i zwraca 201

### EC-2: Równoczesne zapisy (race condition)
Scenariusz: Dwa POST jednocześnie do tego samego pliku
Oczekiwane zachowanie: Obydwa wpisy trafiają do pliku (fs.appendFile jest atomowe dla małych zapisów na macOS); w najgorszym razie kolejność może być zaburzona — akceptowalne

### EC-3: text zawiera znaki specjalne markdown
Scenariusz: `text: "Używaj **bold** w notatce"`
Oczekiwane zachowanie: Tekst jest zapisany as-is (nie escape'owany) — markdown jest intentional

---

## 🚫 Out of Scope tej Story
- Edycja istniejących wpisów
- Usuwanie wpisów
- Wyszukiwanie sekcji przy zapisie lessons (append only)
- Parsowanie GET (STORY-8.1)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] POST /api/patterns dołącza wpis do właściwego pliku z poprawnym formatem
- [ ] POST /api/lessons dołącza sekcję do LESSONS_LEARNED.md z poprawnym formatem
- [ ] Brakujące wymagane pola zwracają 400 z czytelnym komunikatem po polsku
- [ ] Niezalogowane wywołanie zwraca 401; nie-admin zwraca 403
- [ ] Plik jest tworzony jeśli nie istnieje
- [ ] Story review przez PO
