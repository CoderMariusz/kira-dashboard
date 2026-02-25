---
story_id: STORY-7.8
title: "Run History Timeline + Failing Tasks Diff Viewer"
epic: EPIC-7
domain: frontend
difficulty: hard
recommended_model: sonnet
priority: must
depends_on: [STORY-7.5, STORY-7.6]
blocks: []
---

## 🎯 Cel
Zbudować sekcję "Historia Runów" z timelineą runów eval i widokiem szczegółów
z per-task diff (expected vs actual), delta badges i filtrowaniem.

## Kontekst
**Projekt:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`
Sprawdź: `cat app/(dashboard)/eval/page.tsx` — istniejąca strona
Hook: `useEvalRuns()` i `useEvalRunDetail()` z STORY-7.5
Kolory: success `#34d399`, fail `#f87171`, accent `#818cf8`, bg `#0d0c1a`, border `#2a2540`

## ✅ Acceptance Criteria

### AC-1: Timeline runów
Komponent: `components/eval/RunHistoryTimeline.tsx`

- Lista ostatnich 20 runów (domyślnie), `useEvalRuns({ limit: 20 })`
- Per run item:
  - Ikona: ✅ (PASS `#34d399`) / ❌ (FAIL `#f87171`) / ⏳ (RUNNING) / ⚠️ (ERROR)
  - Data i godzina: `"25 lut, 14:32"`
  - Score: `"87% (14/16 passed)"`
  - Czas trwania: `"2m 34s"` lub `"—"` jeśli null
  - Delta badge (jeśli dostępne z poprzedniego załadowania): `"↑ 2 naprawione"` zielony / `"↓ 3 nowe błędy"` czerwony
- Kliknięcie w run → zaznacza go (selected state) i pokazuje szczegóły poniżej
- Loading: skeleton 5 wierszy
- Pusta lista: `"Brak runów eval. Uruchom pierwszy eval klikając 'Uruchom Eval'."`
- "Załaduj więcej" przycisk jeśli `has_more: true`

### AC-2: Panel szczegółów runu
Komponent: `components/eval/RunDetailPanel.tsx`

- Pojawia się po kliknięciu runu w timeline (slide-in animacja 200ms)
- Nagłówek: data runu + score + status badge + czas
- Delta summary: `"↑ 2 naprawione / ↓ 3 nowe błędy / 11 bez zmian"` lub `"Brak poprzedniego runu do porównania"`
- Lista task results:
  - Filter: "Wszystkie" | "Tylko błędy" | "Naprawione"
  - Per task: prompt (truncated), kategoria badge, PASS/FAIL badge
  - Kliknięcie → rozwija diff viewer (AC-3)

### AC-3: Diff Viewer
Komponent: `components/eval/TaskDiffViewer.tsx`

- Widok side-by-side na desktop (≥768px), stacked na mobile
- Lewa kolumna: "Oczekiwany output" (zielone tło `rgba(52,211,153,0.1)`)
- Prawa kolumna: "Faktyczny output" (czerwone tło `rgba(248,113,113,0.1)` jeśli failed)
- Kolorowanie linii:
  - `type: 'equal'` → normalny tekst
  - `type: 'insert'` → zielone tło `rgba(52,211,153,0.2)`, prefix `+`
  - `type: 'delete'` → czerwone tło `rgba(248,113,113,0.2)`, prefix `-`
- Font: `font-family: monospace`, `font-size: 13px`, `line-height: 1.5`
- Collapse/expand: długie outputy (>20 linii) domyślnie zwinięte z "Pokaż więcej"
- diff_score badge: `"Zgodność: 87%"` z kolorem (≥90% zielony, 70-90% żółty, <70% czerwony)

### AC-4: Delta badges w timeline
Po załadowaniu szczegółów pierwszego runu:
- Zaktualizuj items w timeline o delta info
- `newly_failed.length > 0` → `"↓ N nowych błędów"` badge czerwony
- `newly_passed.length > 0` → `"↑ N naprawionych"` badge zielony

### AC-5: Integracja ze stroną eval
Zaktualizuj `app/(dashboard)/eval/page.tsx`:
- Dodaj `<RunHistoryTimeline>` i `<RunDetailPanel>` pod sekcją Golden Tasks
- State: `selectedRunId: string | null` zarządzany na poziomie strony
- `<RunDetailPanel>` renderuje się warunkowo gdy `selectedRunId !== null`

### AC-6: Responsywność
- Desktop (≥1024px): timeline po lewej (300px), detail po prawej (flex-1)
- Tablet (≥768px): timeline na górze, detail pod spodem
- Mobile (<768px): tylko timeline; po kliknięciu → detail jako fullscreen overlay

### AC-7: TypeScript + Lint
`npx tsc --noEmit` → 0 błędów
`npm run lint -- --quiet` → 0 warnings

## ⚠️ Uwagi
- `diff_lines` są już obliczone przez backend (STORY-7.4) — nie przeliczaj w frontend
- `useEvalRunDetail(selectedRunId)` z SWR — automatyczny refetch przy zmianie runId
- Animacje: CSS `transition` (nie framer-motion) — mniej zależności
- NIE modyfikuj istniejących `EvalFrameworkPanel`, `CostTrackerPanel`

## ✔️ DoD
- [ ] Timeline z listą runów + loading skeleton
- [ ] Panel szczegółów z listą task results
- [ ] Diff viewer z kolorowaniem linii
- [ ] Delta badges w timeline
- [ ] Responsywność desktop/tablet/mobile
- [ ] Integracja ze stroną eval
- [ ] TS + Lint clean
- [ ] Commit na `feature/STORY-7.8`
