---
epic_id: EPIC-7
title: "Eval Page — Golden Tasks, Run History, Diff Viewer"
module: eval
status: draft
priority: should
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-7 buduje React page `/pages/eval/` do zarządzania systemem ewaluacji modeli AI w pipeline Kiry. Strona umożliwia zarządzanie "golden tasks" (wzorcowymi zadaniami z oczekiwanymi wynikami), przeglądanie historii runów ewaluacyjnych z diff viewerem (oczekiwany vs rzeczywisty output), triggerowanie eval z UI oraz wizualizację pass/fail per model i per task. Strona jest dostępna wyłącznie dla roli `admin`.

## 🎯 CEL BIZNESOWY

Mariusz dodaje nowy golden task po wykryciu regresjii modelu i triggeruje eval z UI — wynik widzi w 2 minuty bez zaglądania do Bridge CLI.

## 👤 PERSONA

**Mariusz (Admin)** — developer Kiry. Po każdym update modelu lub zmianie promptu chce sprawdzić czy system nadal działa poprawnie na zestawie golden tasks. Potrzebuje szybkiego diff viewera — co model odpowiedział vs co powinien był odpowiedzieć.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: Bridge API proxy — eval dane z Bridge; React Pages scaffold
- EPIC-3: Auth guard — strona wymaga roli `admin`
- EPIC-2: Write operations — "Run Eval Now" button korzysta z write ops proxy (opcjonalnie)

### Blokuje (ten epic odblokowuje):
- Brak bezpośrednich blokerów — strona jest standalone

## 📦 ZAKRES (In Scope)

- **Golden tasks CRUD** — lista golden tasks z `GET /api/bridge/eval/tasks`; add new task: input + expected output (markdown) + model target; edit / delete; `POST /api/bridge/eval/tasks`, `PATCH`, `DELETE`
- **Run history** — lista runów ewaluacyjnych z `GET /api/bridge/eval/runs?limit=50`; per run: timestamp, model, task count, pass/fail counts, duration; click → run detail
- **Diff viewer** — per run, per task: left=expected output (markdown rendered), right=actual output (markdown rendered); highlight divergences (diff library: `diff-match-patch` lub prosty line-diff); badge PASS/FAIL
- **"Run Eval Now" button** — trigger przez `POST /api/bridge/eval/trigger`; loading spinner + "Eval running…" overlay; po zakończeniu (polling lub SSE z EPIC-2) → redirect do nowego run
- **Pass/fail visualization** — Recharts bar chart: pass rate per model (ostatnie 5 runów); heatmap per task × model (zielone/czerwone kwadraty)

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Definiowanie eval metrics** — metryki (exact match, semantic similarity, BLEU) są konfigurowalne przez `bridge.yml`, nie przez UI
- **Automatyczne uruchamianie eval (cron)** — schedule eval to Bridge configuration; tu tylko manual trigger z UI
- **Import/export golden tasks** — CRUD z UI wystarczy; bulk import CSV/JSON to future

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Strona `/pages/eval/` wyświetla listę golden tasks z Bridge API; add/edit/delete działają
- [ ] "Run Eval Now" → loading overlay → po zakończeniu nowy run pojawia się na liście run history
- [ ] Diff viewer: dla każdego task w run pokazuje expected vs actual output z highlightowaniem różnic
- [ ] Pass/fail visualization: Recharts bar chart z pass rate per model ładuje się poprawnie
- [ ] Strona niedostępna dla roli `home` / `home_plus` — redirect na dashboard

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-7.1 | backend | Eval API — golden tasks CRUD + trigger + run history | Endpointy `GET/POST/PATCH/DELETE /api/bridge/eval/tasks`, `POST /api/bridge/eval/trigger`, `GET /api/bridge/eval/runs` — proxy do Bridge API |
| STORY-7.2 | wiring | Typy + API client dla Eval module | Typy `GoldenTask`, `EvalRun`, `EvalResult`; serwis `evalApi` w `_shared/lib/eval-api.ts` |
| STORY-7.3 | frontend | Golden tasks list + CRUD forms | Komponent `GoldenTasksList` z tabelą, add/edit modal (textarea dla expected output), delete confirm |
| STORY-7.4 | frontend | Run history + diff viewer + pass/fail charts | Komponent `EvalRunHistory` z tabelą runów, `DiffViewer` (expected vs actual, line-diff highlight), `PassFailChart` (Recharts bar) |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | eval |
| Priorytet | Should |
| Szacunek | M (4-5 dni) |
| Ryzyko | Niskie — dane z Bridge API, diff viewer to biblioteka, UI stosunkowo liniowe |
| Domeny | backend, wiring, frontend |
| Stack | React 19, Recharts, diff-match-patch (lub własny line-diff), react-markdown, shadcn/ui (Dialog, Table, Badge) |
| Uwagi | Diff viewer — nie rób własnego diffowania od zera. Użyj `diff-match-patch` (Google, bez deps) lub `jsdiff`. Renderuj markdown w obu panelach przez `react-markdown`. |
