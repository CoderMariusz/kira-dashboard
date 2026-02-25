---
story_id: STORY-8.3
title: "Typy TypeScript + hooki usePatternPage() i useLessons() dla Patterns page"
epic: EPIC-8
module: dashboard
domain: wiring
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 4h
depends_on: [STORY-8.1, STORY-8.2]
blocks: [STORY-8.4, STORY-8.5, STORY-8.6, STORY-8.7]
tags: [types, hooks, swr, api-client, patterns, lessons]
---

## 🎯 User Story

**Jako** developer frontendu
**Chcę** mieć gotowe typy TypeScript i hooki SWR dla Patterns page
**Żeby** komponenty STORY-8.4–8.7 mogły korzystać z danych bez żadnych `any` i z pełną obsługą błędów

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Pliki do stworzenia:
- `types/patterns.ts` — typy PatternCard, Lesson, LessonSeverity, PatternType, PatternsResponse
- `services/patterns.service.ts` — klient API (fetch wrapper)
- `hooks/usePatternPage.ts` — SWR hook dla GET /api/patterns
- `hooks/useAddPattern.ts` — mutation hook dla POST /api/patterns
- `hooks/useAddLesson.ts` — mutation hook dla POST /api/lessons

Uwaga: Sprawdź czy istnieje `hooks/usePatterns.ts` (stub z epic-7 lub wcześniej) — jeśli tak, rozbuduj zamiast tworzyć od nowa.

Projekt: `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`

### Powiązane pliki
- `types/eval.ts` — wzorzec typów do naśladowania (z EPIC-7)
- `hooks/useEvalTasks.ts` — wzorzec SWR hook do naśladowania

### Stan systemu przed tą story
- STORY-8.1 i STORY-8.2 zaimplementowane (endpointy /api/patterns i /api/lessons działają)
- SWR zainstalowany w projekcie

---

## ✅ Acceptance Criteria

### AC-1: Typy PatternCard i Lesson zgodne z response API
GIVEN: Endpoint GET /api/patterns zwraca `{ patterns: PatternCard[], lessons: Lesson[], meta: {...} }`
WHEN: Frontend importuje typy z `@/types/patterns`
THEN: Typy `PatternCard` i `Lesson` dokładnie odpowiadają schematowi z STORY-8.1
AND: Brak pól `any` — każde pole ma explicite typ
AND: Enum `LessonSeverity = 'info' | 'warning' | 'critical'` i `PatternType = 'PATTERN' | 'ANTI_PATTERN'` są wyeksportowane

### AC-2: usePatternPage() zwraca dane, stan loading, stan error z auto-refresh
GIVEN: Komponent używa `const { patterns, lessons, meta, isLoading, error, refresh } = usePatternPage()`
WHEN: Komponent się montuje
THEN: Hook wywołuje GET /api/patterns przez SWR
AND: Po 60 sekundach bez aktywności hook automatycznie odświeża dane (refreshInterval: 60000)
AND: `isLoading = true` dopóki dane nie przyjdą; `error` jest ustawione jeśli request się nie powiódł
AND: `refresh()` manualnie odświeża dane (mutate SWR)

### AC-3: useAddPattern() — mutation z optymistycznym append
GIVEN: Komponent używa `const { addPattern, isLoading, error } = useAddPattern()`
WHEN: Wywołuje `addPattern({ type: 'PATTERN', ... })`
THEN: Hook wysyła POST /api/patterns z body
AND: Po sukcesie wywołuje `mutate()` na kluczu SWR GET /api/patterns (invalidate cache)
AND: Hook zwraca `isLoading: true` podczas requestu i `error` jeśli request się nie powiódł
AND: W przypadku błędu serwera hook rzuca lub zwraca `error` z czytelnym komunikatem po polsku

### AC-4: useAddLesson() — analogicznie do useAddPattern()
GIVEN: Komponent używa `const { addLesson, isLoading, error } = useAddLesson()`
WHEN: Wywołuje `addLesson({ id: "BUG-004", title: "...", ... })`
THEN: Hook wysyła POST /api/lessons
AND: Po sukcesie invaliduje SWR cache GET /api/patterns (bo lessons są tam zwracane)
AND: Zwraca isLoading + error

### AC-5: Obsługa błędów API — tłumaczenie kodów HTTP na komunikaty PL
GIVEN: Serwis patterns.service.ts wywołuje API i dostaje odpowiedź 4xx/5xx
WHEN: Hook propaguje błąd do komponentu
THEN: `error.message` jest po polsku i zrozumiały dla użytkownika:
- 401 → "Twoja sesja wygasła — zaloguj się ponownie"
- 403 → "Nie masz uprawnień do tej operacji"
- 500 → "Błąd serwera — spróbuj ponownie za chwilę"
- Bridge offline → "Nie można połączyć się z Bridge — sprawdź połączenie"

---

## 🔌 Szczegóły Wiring

### Typy współdzielone

Plik: `types/patterns.ts`

```typescript
export type PatternType    = 'PATTERN' | 'ANTI_PATTERN'
export type LessonSeverity = 'info' | 'warning' | 'critical'
export type PatternSource  = 'patterns.md' | 'anti-patterns.md'
export type LessonSource   = 'LESSONS_LEARNED.md' | 'anti-patterns.md'

export interface PatternCard {
  id:              string
  source:          PatternSource
  type:            PatternType
  category:        string
  date:            string | null
  model:           string | null
  domain:          string | null
  text:            string
  tags:            string[]
  related_stories: string[]
  occurrences:     number
}

export interface Lesson {
  id:         string
  source:     LessonSource
  title:      string
  severity:   LessonSeverity
  category:   string
  date:       string | null
  body:       string
  root_cause: string | null
  fix:        string | null
  lesson:     string
  tags:       string[]
}

export interface PatternsMeta {
  total_patterns: number
  total_lessons:  number
  sources:        string[]
  generated_at:   string
}

export interface PatternsResponse {
  patterns: PatternCard[]
  lessons:  Lesson[]
  meta:     PatternsMeta
}

// DTOs dla POST
export interface AddPatternDTO {
  type:              PatternType
  category:          string
  text:              string
  model?:            string
  domain?:           string
  date?:             string
  related_stories?:  string[]
}

export interface AddLessonDTO {
  id:          string
  title:       string
  severity:    LessonSeverity
  category:    string
  body:        string
  root_cause?: string
  fix?:        string
  lesson:      string
  tags?:       string[]
  date?:       string
}

export interface ApiError {
  statusCode: number
  message:    string
}
```

### Serwis API klienta

Plik: `services/patterns.service.ts`

```typescript
// Kontrakt

getPatterns(): Promise<PatternsResponse>

addPattern(dto: AddPatternDTO): Promise<{ success: true; entry: string }>

addLesson(dto: AddLessonDTO): Promise<{ success: true }>
```

### Obsługa błędów na styku

```typescript
// services/patterns.errors.ts
export const PATTERN_ERROR_MESSAGES: Record<number, string> = {
  401: 'Twoja sesja wygasła — zaloguj się ponownie',
  403: 'Nie masz uprawnień do tej operacji',
  404: 'Zasób nie został znaleziony',
  500: 'Błąd serwera — spróbuj ponownie za chwilę',
}

// Błąd sieci (fetch threw)
export const NETWORK_ERROR_MESSAGE = 'Nie można połączyć się z serwerem — sprawdź połączenie'
```

### Klucz SWR
```typescript
const SWR_KEY_PATTERNS = '/api/patterns'
```

### Optymistyczny UI
- `usePatternPage` — NIE optymistyczny; czeka na response (dane z pliku, nie krytyczna latencja)
- `useAddPattern` / `useAddLesson` — NIE optymistyczny append (dla bezpieczeństwa spójności); invaliduje cache po sukcesie → SWR refetches

---

## ⚠️ Edge Cases

### EC-1: SWR refetch gdy zakładka staje się aktywna
Scenariusz: Użytkownik przełącza się między zakładkami przeglądarki
Oczekiwane zachowanie: `revalidateOnFocus: false` — NIE refetchuj przy focusie (pliki zmieniają się rzadko; refreshInterval=60s wystarczy)

### EC-2: Concurrent mutations (dwa POST naraz)
Scenariusz: Użytkownik klika "Dodaj" dwa razy szybko
Oczekiwane zachowanie: Hook `isLoading = true` blokuje drugi submit (buttony disabled gdy isLoading); drugi submit jest ignorowany

### EC-3: Response ma brakujące pola (np. stara wersja API)
Scenariusz: API zwraca PatternCard bez pola `occurrences`
Oczekiwane zachowanie: Typy są wystarczająco defensive; hook zwraca dane bez crashu; brakujące pola mają sensowne defaults (occurrences: 1)

---

## 🚫 Out of Scope tej Story
- Komponenty UI (STORY-8.4–8.7)
- Filtrowanie/search (logika filtrowania w komponentach, nie w hooku)
- Websocket / real-time

---

## ✔️ Definition of Done
- [ ] Wszystkie typy wyeksportowane z `types/patterns.ts` — zero `any`
- [ ] `usePatternPage()` działa z SWR, refreshInterval=60s, zwraca patterns, lessons, meta, isLoading, error, refresh
- [ ] `useAddPattern()` i `useAddLesson()` wysyłają POST i invalidują cache po sukcesie
- [ ] Serwis obsługuje wszystkie kody błędów z komunikatami po polsku
- [ ] Brak błędów TypeScript (`tsc --noEmit` czyste)
- [ ] Story review przez PO
