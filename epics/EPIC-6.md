---
epic_id: EPIC-6
title: "Pipeline Page + Gate System UI + PRD Wizard + Projects Page + Skills Page"
module: pipeline
status: draft
priority: must
estimated_size: XL
risk: high
---

## 📋 OPIS

EPIC-6 buduje najzłożniejszą część KiraBoard — React page `/pages/pipeline/` z pełnym zarządzaniem stories i gate system visualization, PRD Wizard do tworzenia nowych projektów przez AI (3-step modal z Claude API), dedykowaną stronę zarządzania projektami `/pages/projects/` oraz stronę przeglądania skilli OpenClaw `/pages/skills/`. Pipeline page pokazuje stories z Gate System — 5 kolorowych kwadratów per story (IMPLEMENT/LINT/TEST/REVIEW/MERGE), bulk actions, story detail modal i project namespace filtering. To główne narzędzie Mariusza do zarządzania pipeline'm Kiry.

## 🎯 CEL BIZNESOWY

Mariusz klika "Bulk Advance" na 3 stories do statusu REVIEW, widzi natychmiast gate compliance % projektu i dodaje nowy projekt przez PRD Wizard — wszystko bez Bridge CLI w terminalu.

## 👤 PERSONA

**Mariusz (Admin)** — zarządza pipeline'm Kiry. Codziennie przegląda stories, sprawdza gate compliance, zaawansowuje stories, monitoruje koszty per projekt. Używa PRD Wizard do wrzucania nowych wymagań bez ręcznego pisania epiców.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: Bridge API proxy, `kb_story_gates`, `gate_config.json`, `GET/POST /api/gates/*`, Gate tracking API
- EPIC-3: Auth guard — strona wymaga roli `admin`
- EPIC-0: React Pages scaffold (Vite build infra, `_shared/`)
- EPIC-2: Write operations (`POST /api/bridge/stories/:id/advance`) — używane przez bulk actions

### Blokuje (ten epic odblokowuje):
- EPIC-7: Eval page linkuje do story detail z Pipeline page
- EPIC-2: Pipeline page jest głównym konsumentem SSE live updates

## 📦 ZAKRES (In Scope)

- **Pipeline view** — lista stories z Bridge API, filtrowana per aktywny projekt (story namespace `{project_key}:{story_id}`); kolumny: Story ID, Tytuł, Domena, Model, Status badge, 5 gate squares; click row → Story Detail modal
- **Gate System UI** — per story: 5 kolorowych kwadratów (IMPLEMENT/LINT/TEST/REVIEW/MERGE); kolory: pending=szary, active=niebieski, pass=zielony, fail=czerwony, skip=żółty; hover → tooltip z timestamp i detalami gate
- **Gate compliance banner** — na górze Pipeline page: "Gate compliance: 87% (42/48 stories z all gates passed)", link "⚠️ 3 stories z skipped gates" → tab filter
- **"Skipped Gates" tab** — filtr: wyświetla tylko stories gdzie co najmniej jeden gate ma status `skip`; pomaga wykryć ominiete kroki
- **Bulk actions** — checkbox per story + sticky toolbar: "Advance selected (3) → REVIEW", "Assign model → Codex", "Re-run gate → TEST"; `POST /api/bridge/bulk-action` → sequential Bridge CLI calls
- **Story Detail modal** — pełny widok story: metadata (ID, domena, model, status, dates), gate timeline (5 gates z timestamps, details JSON), run history (tabela: model, duration, tokens, cost, status), lessons learned (markdown)
- **PRD Wizard** — 3-step modal: Step 1 = PRD textarea (paste PRD text); Step 2 = AI questions (5 pytań wygenerowanych przez Claude Haiku via `/api/pipeline/prd-questions`); Step 3 = Preview epics/stories + "Zarejestruj w Bridge"; backend: `POST /api/pipeline/prd-questions` (Anthropic API) + `POST /api/pipeline/create-from-prd` (epics → Bridge CLI)
- **Project switcher** — dropdown na górze Pipeline page: zmiana projektu → reload stories list per nowy projekt; stats per projekt: done/total/in_progress
- **Projects Page (`/pages/projects/`)** — lista projektów z `GET /api/projects/list-detailed`: karty z progress bar, gate compliance %, tags; comparison table (side-by-side stats); actions: Switch, Open Pipeline, PRD Wizard, Archive; tabs: All / Active / Archived
- **Skills Page (`/pages/skills/`)** — grid kart skilli OpenClaw z `GET /api/skills/installed` (proxy OpenClaw); tabs: Installed / Available / Community; search + filter; `POST /api/skills/install`, `DELETE /api/skills/uninstall`

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Story creation (manual)** — stories tworzone przez Bridge CLI lub PRD Wizard; ręczne tworzenie single story z UI to future
- **PR creation / GitHub integration** — merge gate to status w KiraBoard; rzeczywisty PR na GitHub to poza scope (mogłoby być w future)
- **Real-time SSE auto-refresh** — pipeline view może się odświeżyć po SSE event, ale infrastruktura SSE to EPIC-2; tu statyczne + manual refresh

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Pipeline page wyświetla stories aktywnego projektu z 5 gate squares per story; zmiana projektu → lista się aktualizuje
- [ ] Gate compliance banner pokazuje poprawny % (obliczony z `kb_story_gates`); klik "⚠️ skipped" → filtr działa
- [ ] Bulk action "Advance 2 stories → REVIEW": obie stories zmieniają status w Bridge, toast "2 stories advanced ✅"
- [ ] PRD Wizard Step 1→2→3: wklejony PRD → 5 pytań AI → preview epiców → "Zarejestruj" → Bridge tworzy stories
- [ ] Projects Page wyświetla wszystkie projekty z kartami, gate compliance %, comparison table
- [ ] Skills Page wyświetla zainstalowane skille OpenClaw z przyciskami Uninstall; search filtruje listę
- [ ] Story Detail modal otwiera się po kliknięciu row, pokazuje gate timeline z timestamps i run history

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-6.1 | backend | Pipeline stories API — list + filter per project | Endpoint `GET /api/pipeline/stories?project=<key>&status=<s>` → Bridge proxy z namespace filtering i gate data join |
| STORY-6.2 | backend | Bulk actions API + PRD Wizard backend | Endpoint `POST /api/pipeline/bulk-action` (sequential Bridge calls) + `POST /api/pipeline/prd-questions` (Anthropic API) + `POST /api/pipeline/create-from-prd` (Bridge CLI) |
| STORY-6.3 | backend | Projects API + Skills API (OpenClaw proxy) | Endpoint `GET /api/projects/list-detailed` (aggregate stats + gate compliance) + `GET/POST/DELETE /api/skills/*` (OpenClaw proxy) |
| STORY-6.4 | wiring | Typy + API client dla Pipeline, Projects, Skills | Typy `Story`, `Gate`, `Project`, `Skill`, `BulkAction`; serwisy `pipelineApi`, `projectsApi`, `skillsApi` w `_shared/lib/` |
| STORY-6.5 | frontend | Pipeline view — story list + gate squares + project switcher | Komponent `PipelineView`: tabela stories z gate squares (5 kolorów), project switcher dropdown, status badges |
| STORY-6.6 | frontend | Gate System UI — compliance banner + skipped filter | Komponent `GateComplianceBanner` + tab "Skipped Gates" filter; hover tooltip na gate square z detalami |
| STORY-6.7 | frontend | Bulk actions toolbar + Story Detail modal | Komponent `BulkActionsToolbar` (sticky, checkbox select) + `StoryDetailModal` (gate timeline, run history, lessons) |
| STORY-6.8 | frontend | PRD Wizard — 3-step modal z AI integration | Komponent `PRDWizard`: 3-step form (textarea → AI questions → preview + register); loading states, error handling |
| STORY-6.9 | frontend | Projects Page — karty + comparison table | Strona `pages/projects/`: grid kart projektów, comparison table, tabs (All/Active/Archived), actions (Switch/PRD Wizard/Archive) |
| STORY-6.10 | frontend | Skills Page — grid + search + install/uninstall | Strona `pages/skills/`: grid kart skilli, search, tabs (Installed/Available), install/uninstall buttons z confirm dialog |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | pipeline |
| Priorytet | Must |
| Szacunek | XL (7-10 dni) |
| Ryzyko | Wysokie — AI integration (PRD Wizard → Anthropic API koszty), Gate System logika powiązana z Bridge, złożona UI z wieloma stanami |
| Domeny | backend, wiring, frontend |
| Stack | React 19, Tailwind, shadcn/ui (Dialog, Checkbox, Badge, Tooltip, Table), Anthropic SDK, Bridge CLI wrapper (exec), better-sqlite3 |
| Uwagi | PRD Wizard to jedyne miejsce gdzie używamy Anthropic API po stronie serwera KiraBoard (nie przez OpenClaw). Należy cachować odpowiedzi żeby uniknąć podwójnych wywołań. Gate System to oryginalna feature KiraBoard — nie ma wzorca w open source inspiracjach, implementuj ściśle per PRD sekcja 5c. |
