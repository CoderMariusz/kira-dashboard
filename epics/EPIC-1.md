---
epic_id: EPIC-1
title: "Dashboard Widgets — 9 nowych widgetów KiraBoard"
module: widgets
status: draft
priority: must
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-1 dodaje 9 nowych widgetów specyficznych dla KiraBoard, które rozszerzają istniejące 50 widgetów LobsterBoard o dane z systemu Kira — Bridge API, modele AI, NightClaw, Gate System i projekt management. Widgety są budowane w stylu LobsterBoard (`generateHtml()` + `generateJs()`), konsumują nowe endpointy z EPIC-0, i od razu działają w trybie drag-and-drop edytora. Mariusz po zalogowaniu widzi pełen obraz stanu systemu: ile stories w pipeline, jak działają modele, co NightClaw zrobił w nocy, czy wszystkie serwisy są online.

## 🎯 CEL BIZNESOWY

Mariusz otwiera KiraBoard i w 10 sekund widzi stan całego systemu Kira — pipeline, modele, NightClaw, serwisy i projekt — bez zaglądania do Bridge CLI.

## 👤 PERSONA

**Mariusz (Admin)** — developer zarządzający pipeline'm Kiry. Codziennie rano potrzebuje szybkiego przeglądu: co jest w toku, jak pracują modele, co NightClaw zrobił w nocy, czy Bridge i OpenClaw działają. Każdy widget to jeden rzut oka na jeden aspekt systemu.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: Bridge API proxy (`/api/bridge/*`), endpoint health-check, SQLite z tabelą `kb_story_gates`, `gate_config.json`, `sync_to_supabase.js`

### Blokuje (ten epic odblokowuje):
- EPIC-2: Widget `pipeline-status` jest konsumowany przez SSE overlay — widgety muszą istnieć
- EPIC-6: Widget `project-switcher` integruje się z Pipeline page

## 📦 ZAKRES (In Scope)

- **Widget `pipeline-status`** — konsumuje `GET /api/bridge/status/pipeline` → wyświetla liczniki stories per status: IN_PROGRESS / REVIEW / DONE / BLOCKED; ikony kolorowe per status; link do Pipeline page
- **Widget `velocity-chart`** — konsumuje `GET /api/bridge/status/runs?days=30` → Chart.js line chart, liczba ukończonych stories per dzień, toggle 7d/30d
- **Widget `model-agents`** — konsumuje `GET /api/bridge/status/models` → 4 karty per model (Codex, Kimi, GLM, Haiku) z success rate %, avg duration, sparkline ostatnich 10 runów
- **Widget `morning-briefing`** — agregat z wielu źródeł: NightClaw summary (ostatni digest) + tasks today count + shopping count + weather (wttr.in) + system status (Bridge/OpenClaw up/down); jeden widget = pełny obraz poranka, unikalne dla KiraBoard
- **Widget `service-health`** — konsumuje `GET /api/health-check` → lista serwisów (Bridge, OpenClaw, Supabase) z badge up/down + latency w ms; Dashy-inspired; konfiguracja URL w `healthchecks.json`
- **Widget `nightclaw-card`** — konsumuje `GET /api/bridge/nightclaw/summary` → preview ostatniego NightClaw digest: data, liczba patterns znalezionych, kluczowe lekcje (pierwsze 2 bullet points), link do NightClaw page
- **Widget `patterns-summary`** — konsumuje `GET /api/bridge/patterns` → top 5 patterns według count użycia + liczba anti-patterns, link do Patterns page
- **Widget `gateway-status`** — konsumuje `GET /api/health-check` → status połączenia z OpenClaw gateway: connected/disconnected badge, wersja, liczba aktywnych sessionów
- **Widget `project-switcher`** — konsumuje `GET /api/bridge/projects/list` → dropdown z listą projektów, aktualny projekt highlighted, click = zmiana aktywnego projektu; stats per projekt: done/total stories

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Modyfikacja istniejących 50 widgetów LobsterBoard** — żadne zmiany w CPU, Docker, Clock, Weather, GitHub Stats itd. (pozostają bez zmian)
- **Widgety dla użytkowników home** — wszystkie 9 widgetów są dla roli `admin`; widgety dla Angeliki/Zuzy/Izy są częścią EPIC-4 (Home Dashboard)
- **Real-time auto-refresh widgetów** — odświeżanie manualne lub standardowy interval LobsterBoard; SSE overlay to EPIC-2
- **Konfiguracja widgetów z UI** — widgety mają domyślne opcje, zaawansowana konfiguracja per-widget to poza scope

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Wszystkie 9 widgetów pojawia się w widget gallery LobsterBoard i można je dodać do dashboardu metodą drag-and-drop
- [ ] Widget `service-health` pokazuje status Bridge, OpenClaw i Supabase z latency w ms; gdy Bridge offline → wyświetla czerwone badge "DOWN"
- [ ] Widget `morning-briefing` wyświetla NightClaw summary + tasks count + shopping count + service status jako jeden spójny widget po porannym zalogowaniu
- [ ] Widget `pipeline-status` poprawnie odzwierciedla counts stories z Bridge API w czasie rzeczywistym (po manualnym odświeżeniu)
- [ ] Widget `model-agents` wyświetla success rate i sparkline dla co najmniej jednego modelu z Bridge API
- [ ] Widget `project-switcher` zmienia aktywny projekt po kliknięciu i persystuje wybór (localStorage)
- [ ] Gdy Bridge API offline, wszystkie widgety zależne od Bridge pokazują graceful fallback: "Bridge offline" z ostatnią znana wartością (lub N/A)

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-1.1 | backend | Endpointy danych dla widgetów (Bridge aggregate) | Nowe API routes: `/api/bridge/status/pipeline`, `/api/bridge/status/models`, `/api/bridge/nightclaw/summary`, `/api/bridge/projects/list` — proxy + agregacja danych z Bridge |
| STORY-1.2 | frontend | Widget `pipeline-status` + `velocity-chart` | Dwa widgety LobsterBoard: liczniki stories per status + Chart.js line chart z 7d/30d toggle |
| STORY-1.3 | frontend | Widget `model-agents` | Widget z 4 kartami modeli: success rate, avg duration, sparkline ostatnich 10 runów |
| STORY-1.4 | frontend | Widget `morning-briefing` | Agregowany widget poranny: NightClaw digest preview + tasks today + shopping count + service status |
| STORY-1.5 | frontend | Widget `service-health` | Widget z listą serwisów (Bridge/OpenClaw/Supabase) i badge up/down + latency — Dashy-inspired |
| STORY-1.6 | frontend | Widget `nightclaw-card` + `patterns-summary` | Dwa widgety: preview ostatniego NightClaw digest + top 5 patterns z count |
| STORY-1.7 | frontend | Widget `gateway-status` + `project-switcher` | Dwa widgety: OpenClaw connection status + project dropdown z persystencją wyboru |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | widgets |
| Priorytet | Must |
| Szacunek | M (3-5 dni) |
| Ryzyko | Niskie — widgety to izolowane HTML/JS, niezależne od siebie |
| Domeny | backend, frontend |
| Stack | Node.js, LobsterBoard widget API (generateHtml/generateJs), Chart.js (już w LobsterBoard), fetch API |
| Inspiracje | Dashy (service-health widget pattern), Beszel (sparkline charts) |
| Uwagi | Widgety budować w stylu istniejących widgetów LobsterBoard — żaden nie wymaga React ani osobnego build. Wszystkie dane przez endpointy z EPIC-0. |
