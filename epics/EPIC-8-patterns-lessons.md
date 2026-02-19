---
epic_id: EPIC-8
title: "Patterns & Lessons — Baza wiedzy pipeline'u"
module: dashboard
status: draft
priority: should
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-8 dostarcza stronę `/dashboard/patterns` — interaktywną bazę wiedzy pipeline'u Kira, podzieloną na dwie sekcje: **Patterns** (co działa ✅) i **Lessons** (co nie działa / lekcje z bugów ⚠️). Dane czytane są bezpośrednio z plików markdown (`.kira/nightclaw/patterns.md`, `.kira/nightclaw/anti-patterns.md`, `.kira/LESSONS_LEARNED.md`) przez dedykowany endpoint Bridge API — bez żadnej bazy danych. Mariusz może przeglądać wzorce i lekcje z filtrowaniem po tagach i wyszukiwaniem, a także dodawać nowe wpisy bezpośrednio z UI (zapisywane do pliku markdown).

## 🎯 CEL BIZNESOWY

Mariusz widzi skumulowaną wiedzę pipeline'u (wzorce, anty-wzorce, lekcje z bugów) w jednym miejscu i może szybko dodać nowy wpis bez otwierania edytora tekstu — utrzymując pliki `.kira/` jako jedyne source of truth.

## 👤 PERSONA

**Mariusz (Admin / Architekt)** — buduje i iteruje pipeline wielomodelowy Kira. Po każdej sesji pracy odkrywa nowe wzorce i anty-wzorce; dotychczas musiał ręcznie edytować pliki markdown. Potrzebuje szybkiego przeglądu całej bazy wiedzy i możliwości dodania obserwacji z poziomu dashboardu — bez otwierania terminala.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- **EPIC-1**: Infrastruktura Next.js dashboard — routing, layout, sidebar, Bridge API proxy (`/api/bridge/[...path]`) — bez tego strona nie ma gdzie żyć
- **Pliki źródłowe**: `.kira/nightclaw/patterns.md`, `.kira/nightclaw/anti-patterns.md`, `.kira/LESSONS_LEARNED.md` — muszą istnieć na dysku (są już obecne)

### Blokuje (ten epic odblokowuje):
- **EPIC-9 (TBD)**: NightClaw — automatyczna detekcja wzorców będzie mogła wyświetlać dane na tej stronie
- **EPIC-10 (TBD)**: Analytics — korelacja wzorców z metrykami sukcesu runów

## 📦 ZAKRES (In Scope)

- **GET /api/patterns** — Bridge-side endpoint; czyta 3 pliki markdown, parsuje wpisy do ustrukturyzowanego JSON (`PatternCard[]` + `Lesson[]`); source of truth zawsze = pliki `.kira/`
- **POST /api/patterns** — dołącza nowy wzorzec / anty-wzorzec na koniec odpowiedniego pliku markdown w formacie `[data] [model?] [domena?] — tekst`
- **POST /api/lessons** — dołącza nową lekcję do `.kira/LESSONS_LEARNED.md` z polami: ID, title, severity, lesson, tagi
- **Sekcja Patterns** — siatka kart (grid), każda karta: typ (PATTERN / ANTI_PATTERN), kategoria, tekst, tagi, occurrences, opcjonalny link do story/epic, źródło pliku
- **Sekcja Lessons** — widok timeline; każdy wpis: severity pill (info / warning / critical), tytuł, kategoria, data, rozwijany body, lekcja w osobnym bloku
- **Search + filter po tagach** — globalne pole search (filtruje obie sekcje) + dropdown tagów; stan zapisywany w URL query params
- **Modal: Dodaj Pattern** — formularz (type, kategoria, tekst, model?, domena?, tagi, related\_stories); walidacja Zod; POST → optymistyczny append
- **Modal: Dodaj Lesson** — formularz (ID, title, severity, kategoria, treść, lekcja, tagi); walidacja Zod; POST → optymistyczny append
- **Stany: loading / empty / error / offline** — dla obu sekcji, spójne z resztą dashboardu (style `#1a1730`, `#2a2540`, `#818cf8`)
- **Sidebar navigation** — pozycja „🧠 Patterns & Lessons" w sekcji Intelligence (mockup v3 linia 363–364), aktywna zakładka podświetlona `#818cf8`

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Baza danych / tabela patterns** — source of truth to pliki markdown; żadnych migracji SQL (EPIC-9 może dodać DB, jeśli będzie potrzebna)
- **Edycja i usuwanie wpisów z UI** — tylko dodawanie; edycja przez plik bezpośrednio (zbyt niebezpieczne dla MVP)
- **Automatyczna ekstrakcja lekcji z runów** — to zadanie NightClaw / EPIC-9; tu tylko ręczny zapis
- **Wersjonowanie plików / git diff** — poza zakresem MVP
- **Real-time sync** — polling co 60s przy aktywnej zakładce; WebSocket w EPIC-15

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] `GET /api/patterns` zwraca poprawny JSON z wpisami ze wszystkich 3 plików markdown; przy brakującym pliku zwraca `[]` dla danej sekcji bez 500
- [ ] Strona `/dashboard/patterns` wyświetla obie sekcje (Patterns + Lessons) z danymi live z endpointu; nie crashuje gdy Bridge offline
- [ ] Search filtruje wpisy po tekście (case-insensitive) w czasie rzeczywistym; filtr tagów zawęża listę do wpisów z pasującym tagiem
- [ ] Modal „Dodaj Pattern" — po submit plik `.kira/nightclaw/patterns.md` (lub `anti-patterns.md`) zawiera nowy wpis w poprawnym formacie markdown
- [ ] Modal „Dodaj Lesson" — po submit plik `.kira/LESSONS_LEARNED.md` zawiera nowy wpis z polami ID / title / severity / lesson
- [ ] Lessons timeline pokazuje severity pills: info (niebieski), warning (żółty), critical (czerwony) — kolory spójne z paletą `#818cf8` / `#fbbf24` / `#f87171`
- [ ] Sidebar „🧠 Patterns & Lessons" podświetla się na `#818cf8` gdy jesteśmy na `/dashboard/patterns`

## 📊 STORIES W TYM EPICU

| Story ID     | Domena   | Tytuł                                                              | Opis jednym zdaniem                                                                                                     |
|--------------|----------|--------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| STORY-8.1    | backend  | GET /api/patterns — parser markdown → JSON                         | Endpoint czyta 3 pliki `.kira/` i zwraca `{ patterns: PatternCard[], lessons: Lesson[] }` z klasyfikacją severity       |
| STORY-8.2    | backend  | POST /api/patterns i POST /api/lessons — zapis do pliku            | Dwa endpointy dołączają nowy wpis do odpowiedniego pliku markdown zachowując istniejący format                          |
| STORY-8.3    | wiring   | Typy TypeScript + serwis API dla Patterns page                    | Nowe typy `PatternCard`, `Lesson`, `LessonSeverity`, `PatternTag` + hooki `usePatternPage()` i `useLessons()` z mapowaniem błędów |
| STORY-8.4    | frontend | Patterns page — szkielet, tabs, search bar, sidebar nav           | Strona `/dashboard/patterns` z tabs Patterns/Lessons, globalnym search, filtrem tagów, sidebar item + URL state          |
| STORY-8.5    | frontend | Sekcja Patterns — siatka kart z tagami i linkami                  | `PatternCard` komponent: typ badge, kategoria, tekst, tagi clickable, occurrences, link do story/epic, źródło pliku     |
| STORY-8.6    | frontend | Sekcja Lessons — timeline view z severity pills                    | `LessonItem` komponent: severity pill, tytuł, data, rozwijany body, lekcja w highlight bloku, filtr severity             |
| STORY-8.7    | frontend | Modals: Dodaj Pattern + Dodaj Lesson z walidacją Zod              | Dwa modale z formularzami RHF+Zod, POST do API, optymistyczny append do listy, toast z potwierdzeniem zapisu             |

## 🔧 SZCZEGÓŁY TECHNICZNE

### GET /api/patterns — format parsowania

**Plik `patterns.md`** — każdy wpis to linia w formacie:
```
- [YYYY-MM-DD] [Model?] [domena?] — tekst wpisu
```
Parser wyciąga: datę, model (np. `GLM-5`, `Kimi K2.5`), domenę (`frontend`, `backend`, etc.), tekst. Nagłówki `##` → `category`. Typ → `PATTERN`.

**Plik `anti-patterns.md`** — analogiczny format, lecz tekst zaczyna się od `NIE ...`. Typ → `ANTI_PATTERN`. Default severity → `warning`.

**Plik `LESSONS_LEARNED.md`** — sekcje `### BUG-XXX: Tytuł`. Parser wyciąga: ID (`BUG-XXX`), tytuł, sekcje `What went wrong`, `Root cause`, `Fix`, `Lesson`. Severity → `critical` dla BUG, `warning` dla LESSON, `info` dla observation. Typ → `LESSON`.

### Mapowanie severity

| Źródło | Domyślna severity |
|--------|------------------|
| `patterns.md` | `info` (pozytywne wzorce) |
| `anti-patterns.md` | `warning` |
| `LESSONS_LEARNED.md` (BUG-XXX) | `critical` |
| `LESSONS_LEARNED.md` (inne sekcje) | `warning` |

### Struktura JSON response

```typescript
// GET /api/patterns response
{
  patterns: PatternCard[]   // z patterns.md + anti-patterns.md
  lessons: Lesson[]         // z LESSONS_LEARNED.md
  meta: {
    total_patterns: number
    total_lessons: number
    sources: string[]        // lista plików które udało się odczytać
    generated_at: string     // ISO timestamp
  }
}

// PatternCard
{
  id: string              // hash z daty + tekstu
  source: 'patterns.md' | 'anti-patterns.md'
  type: 'PATTERN' | 'ANTI_PATTERN'
  category: string        // z nagłówka ## w pliku
  date: string | null     // YYYY-MM-DD
  model: string | null    // GLM-5 | Kimi K2.5 | ...
  domain: string | null   // frontend | backend | ...
  text: string
  tags: string[]          // auto-generowane z model + domain + category
  related_stories: string[] // np. ["STORY-8.1"] — z UI podczas dodawania
  occurrences: number     // 1 dla nowych wpisów
}

// Lesson
{
  id: string              // BUG-XXX lub auto hash
  source: 'LESSONS_LEARNED.md' | 'anti-patterns.md'
  title: string
  severity: 'info' | 'warning' | 'critical'
  category: string
  date: string | null
  body: string            // sekcja "What went wrong" lub pełny tekst
  root_cause: string | null
  fix: string | null
  lesson: string          // wyciągnięta lekcja — zawsze wymagana
  tags: string[]
}
```

### POST /api/patterns — format wpisu do pliku

```
- [{date}] [{model}?] [{domain}?] — {text}
  Related: {related_stories.join(', ')}
```

Dołączany na końcu odpowiedniej sekcji `##` (lub na końcu pliku jeśli kategoria nowa).

### POST /api/lessons — format wpisu do pliku

```markdown
### {id}: {title}

**Severity:** {severity}  
**Tags:** {tags.join(', ')}

{body}

**Lesson:** {lesson}

---
```

### Kolory severity (spójne z paletą dashboardu)

| Severity | Kolor pill | Kolor tła |
|----------|-----------|-----------|
| `info`     | `#818cf8` (indigo) | `#1e1b4b` |
| `warning`  | `#fbbf24` (amber)  | `#2d2000` |
| `critical` | `#f87171` (red)    | `#2d0a0a` |

### Kolory kart Patterns (spójne z StatCard)

- Tło karty: `#1a1730`
- Border: `#2a2540` (hover: `#3b3d7a`)
- Badge PATTERN: `#818cf8` tekst, `#1e1b4b` tło
- Badge ANTI_PATTERN: `#f87171` tekst, `#2d0a0a` tło
- Tag pill: `#2a2540` tło, `#818cf8` tekst

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | dashboard |
| Priorytet | Should |
| Szacunek | M (3–7 dni) |
| Ryzyko | Niskie — brak DB, brak auth, tylko parser plików tekstowych |
| Domeny | backend, wiring, frontend |
| Stack | Next.js 16, shadcn/ui, Tailwind CSS, TypeScript, React Hook Form, Zod |
| DB | Brak — source of truth = pliki `.kira/nightclaw/*.md` + `.kira/LESSONS_LEARNED.md` |
| Bridge API | Nowe endpointy: `GET /api/patterns`, `POST /api/patterns`, `POST /api/lessons` |
| Pliki źródłowe | `.kira/nightclaw/patterns.md`, `.kira/nightclaw/anti-patterns.md`, `.kira/LESSONS_LEARNED.md` |
| Route | `/dashboard/patterns` |
| Sidebar | Sekcja Intelligence → „🧠 Patterns & Lessons" (mockup v3 linia 363–364) |
| Design reference | `kira-dashboard-mockup-v3.html` — paleta `#0d0c1a` bg, `#818cf8` accent |
| Uwagi | Edycja i usuwanie wpisów — poza zakresem MVP. Brak migracji SQL. Istniejący stub `usePatterns.ts` do rozbudowania w STORY-8.3. |
