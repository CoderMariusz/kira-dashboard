---
story_id: STORY-5.3
title: "Model detail panel — performance history, task routing config"
epic: EPIC-5
module: models
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: none
api_reference: /app/api/models/route.ts
priority: must
estimated_effort: 7h
depends_on: [STORY-5.2]
blocks: []
tags: [models, detail, recharts, sparkline, routing, modal]
---

## 🎯 User Story

**Jako** Mariusz (admin)
**Chcę** kliknąć na kartę modelu i zobaczyć panel szczegółów z historią performance i konfiguracją routingu
**Żeby** głębiej przeanalizować konkretny model i sprawdzić do jakich rodzajów zadań jest przypisany

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/models` (panel jako sheet/drawer, nie oddzielna strona)
Komponent: `ModelDetailPanel` — shadcn Sheet (prawy panel slide-in)
Otwierany przez: kliknięcie `ModelCard` (callback `onSelect` z STORY-5.2)

### Powiązane pliki
- `app/models/page.tsx` — zarządza stanem `selectedModel`
- `app/models/components/ModelDetailPanel.tsx` — główny panel
- `app/models/components/TokenSparkline.tsx` — sparkline z Recharts
- `app/models/components/RecentRunsTable.tsx` — tabela ostatnich 10 runów
- `app/models/components/RoutingConfig.tsx` — wyświetlanie przypisań (read-only, edycja → STORY-5.4)
- `app/api/models/[name]/runs/route.ts` — endpoint dla runów per model (do stworzenia w tej story)
- Recharts: `LineChart`, `Line`, `ResponsiveContainer`, `Tooltip`

### Stan systemu przed tą story
- STORY-5.2 gotowy: ModelsList działa, karty klikalne, callback `onSelect(model)` przekazywany
- STORY-5.1 gotowy: `/api/models` działa
- shadcn/ui: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `Table`, `Badge`, `Skeleton`
- Recharts zainstalowany w projekcie

---

## ✅ Acceptance Criteria

### AC-1: Kliknięcie karty modelu otwiera panel szczegółów
GIVEN: admin widzi listę kart modeli na `/models`
WHEN: klika na kartę modelu "sonnet-4.6"
THEN: z prawej strony wysuwa się shadcn Sheet z tytułem "sonnet-4.6 — szczegóły"
AND: panel zawiera sekcje: "Historia tokenów (7d)", "Ostatnie 10 runów", "Routing assignments"
AND: reszta strony jest przyciemniona (overlay)

### AC-2: Sparkline tokenów per tydzień wyświetla się poprawnie
GIVEN: panel otwarty dla modelu z runami w ostatnich 7 dniach
WHEN: dane z `/api/models/{name}/runs?days=7` są załadowane
THEN: Recharts `LineChart` renderuje linię z daily token usage (oś X: dzień tygodnia, oś Y: tokeny)
AND: tooltip po hover pokazuje: dzień, liczba tokenów (input + output osobno)
AND: jeśli model nie miał runów w danym dniu → punkt na 0 (nie brak punktu)

### AC-3: Tabela ostatnich 10 runów wyświetla dane
GIVEN: panel otwarty dla modelu z historią runów
WHEN: `/api/models/{name}/runs?limit=10` zwraca dane
THEN: tabela zawiera kolumny: Data, Story ID, Status (badge zielony/czerwony), Czas trwania, Tokeny
AND: wiersze są posortowane od najnowszego do najstarszego
AND: Story ID jest skrótem klikalnym (link do `/pipeline?story={id}` — target _blank)

### AC-4: Sekcja Routing assignments wyświetla aktualne przypisania (read-only)
GIVEN: panel otwarty, dane z `/api/models/routing-config` dostępne (STORY-5.4)
WHEN: panel renderuje sekcję "Routing assignments"
THEN: wyświetlona jest tabela: Rodzaj zadania (easy/medium/hard/review) → Przypisany model
AND: wiersz przypisany do bieżącego modelu jest wyróżniony (bold lub highlight)
AND: obok tabeli jest przycisk "Edytuj routing" → otwiera edytor (STORY-5.4)

### AC-5: Zamknięcie panelu
GIVEN: panel szczegółów jest otwarty
WHEN: admin klika X w rogu panelu, klika overlay, lub naciska Escape
THEN: panel zamyka się z animacją slide-out
AND: lista modeli wraca do stanu normalnego bez przeładowania danych

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/models` (panel overlay — Sheet, nie oddzielna strona)
Komponent: `ModelDetailPanel`
Plik: `app/models/components/ModelDetailPanel.tsx`

### Endpoint do stworzenia w tej story

**GET /api/models/[name]/runs**
```typescript
// Query params
interface QueryParams {
  days?: 7 | 30   // dla sparkline (default: 7)
  limit?: number   // dla tabeli runów (default: 10, max: 20)
}

// Response
interface ModelRunsResponse {
  daily_tokens: Array<{
    date: string          // "2026-03-01"
    input_tokens: number
    output_tokens: number
  }>
  recent_runs: Array<{
    id: string
    story_id: string
    status: "success" | "failed" | "timeout"
    started_at: string    // ISO 8601
    duration_seconds: number
    input_tokens: number
    output_tokens: number
  }>
}
```

Logika: proxy do Bridge `/api/bridge/status/runs?model=<name>&days=<days>` + formatowanie danych.

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `ModelDetailPanel` | Sheet (shadcn) | `model: ModelWithStats \| null`, `onClose: () => void` | closed, loading, filled |
| `TokenSparkline` | Recharts LineChart | `data: DailyTokens[]`, `days: 7\|30` | loading (Skeleton), empty, filled |
| `RecentRunsTable` | Table (shadcn) | `runs: ModelRun[]` | loading, empty, filled |
| `RoutingConfig` | div | `config: RoutingConfig`, `currentModel: string` | loading, filled |

### Stany widoku

**Loading (panel otwarty, dane się ładują):**
- Sekcja sparkline: Skeleton 100% × 120px
- Sekcja tabela runów: 3 wiersze Skeleton 100% × 32px
- Sekcja routing: Skeleton 4 wiersze × 20px

**Empty (model bez runów):**
- Sparkline: komunikat "Brak danych z ostatnich 7 dni"
- Tabela: "Ten model nie miał jeszcze żadnych uruchomień"

**Error:**
- Alert (variant destructive): "Nie można załadować szczegółów modelu"
- Przycisk "Spróbuj ponownie"

**Filled:**
- Sparkline z danymi (Recharts LineChart)
- Tabela z ostatnimi 10 runami
- Sekcja routing z aktualną konfiguracją

### Layout panelu (ModelDetailPanel)

```
┌──────────────────────────────────────┐
│ ← sonnet-4.6 — szczegóły        [X] │
├──────────────────────────────────────┤
│ Historia tokenów (ostatnie 7 dni)    │
│ [7d] [30d]                           │
│ ▄▂▆▄▇▄▅  ← Recharts LineChart       │
│ input: ─── output: ───               │
├──────────────────────────────────────┤
│ Ostatnie uruchomienia                │
│ Data       Story   Status  Czas  Tok │
│ 2026-03-05 5.2     ✅      12s  2k  │
│ 2026-03-04 4.1     ✅      18s  3k  │
│ 2026-03-04 3.3     ❌       9s  1k  │
│ ... (10 wierszy)                     │
├──────────────────────────────────────┤
│ Routing assignments          [Edytuj]│
│ easy   → kimi-k2.5                   │
│ medium → sonnet-4.6  ← (wyróżniony) │
│ hard   → codex-5.3                   │
│ review → sonnet-4.6  ← (wyróżniony) │
└──────────────────────────────────────┘
```

### Flow interakcji (krok po kroku)

```
1. Admin klika ModelCard → ModelsPage ustawia selectedModel = model
2. ModelDetailPanel montuje się (Sheet open=true) → fetch GET /api/models/{name}/runs
3. Podczas fetch → sekcje pokazują skeletony
4. Dane załadowane → renderuje TokenSparkline + RecentRunsTable + RoutingConfig
5. Admin hover na sparkline → tooltip pokazuje dzień + tokeny
6. Admin klika "30d" toggle w sekcji sparkline → nowy fetch z days=30
7. Admin klika "Edytuj routing" → (STORY-5.4 — tu tylko placeholder lub disabled)
8. Admin klika X lub Escape → Sheet zamknięty → selectedModel = null
```

### Responsive / Dostępność
- Mobile (375px+): Sheet zajmuje 100% szerokości ekranu
- Tablet (768px+): Sheet 480px szerokości
- Desktop (1280px+): Sheet 520px szerokości
- Keyboard: Escape zamyka panel; Tab porusza po linku Story ID i przycisku Edytuj
- ARIA: `SheetTitle` = "Szczegóły modelu {name}"; tabela ma `caption` "Ostatnie uruchomienia"

---

## ⚠️ Edge Cases

### EC-1: Model nie ma danych za wybrany okres (30d) ale ma za 7d
Scenariusz: admin przełącza na 30d, Bridge zwraca puste `daily_tokens` i `recent_runs`
Oczekiwane zachowanie: sparkline pokazuje "Brak danych za ostatnie 30 dni"; tabela "Brak uruchomień"
Komunikat dla użytkownika: "Brak danych za ten okres — przełącz na 7d"

### EC-2: Story ID w tabeli nie istnieje już w systemie
Scenariusz: run ma `story_id` który był usunięty z Bridge
Oczekiwane zachowanie: Story ID wyświetla się jako plain text bez linku (nie klikalny)
Komunikat dla użytkownika: brak (subtelna zmiana — usunięto interaktywność)

### EC-3: Bardzo długi czas trwania runu (>1000s)
Scenariusz: run z `duration_seconds: 1523`
Oczekiwane zachowanie: formatowany jako "25m 23s" zamiast "1523s"
Komunikat dla użytkownika: czytelny czas

### EC-4: Panel otwierany wielokrotnie (szybkie kliknięcia)
Scenariusz: admin klika 3 razy szybko na różne karty
Oczekiwane zachowanie: poprzednie requesty są anulowane (AbortController), panel ładuje dane tylko ostatnio klikniętego modelu
Komunikat dla użytkownika: brak race condition w UI

---

## 🚫 Out of Scope tej Story
- Edycja routing config (switch model per task type) — STORY-5.4
- Monitoring toggle — STORY-5.4
- Inline edycja kosztu tokenów — STORY-5.4
- Export danych do CSV — future feature

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] TokenSparkline renderuje się z Recharts LineChart (input i output jako osobne linie)
- [ ] RecentRunsTable wyświetla 10 ostatnich runów z prawidłowymi danymi
- [ ] RoutingConfig wyświetla aktualne przypisania modeli z wyróżnieniem bieżącego modelu
- [ ] Panel zamyka się przez X, overlay click i Escape
- [ ] AbortController anuluje poprzedni fetch przy zmianie modelu
- [ ] Czas trwania >60s wyświetlany jako "Xm Ys"
- [ ] Widok działa na mobile 375px (Sheet 100% szerokości)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Kod przechodzi linter bez błędów (ESLint + TypeScript strict)
- [ ] Story review przez PO
