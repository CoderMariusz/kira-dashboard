---
epic_id: EPIC-5
title: "Models Page — Rejestr Modeli AI, Stats, Cost Editing, Usage Charts"
module: models
status: draft
priority: should
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-5 buduje React page `/pages/models/` — dashboard modeli AI używanych przez Kirę w pipeline. Wyświetla listę modeli z Bridge API (Codex, Kimi, GLM, Haiku, Sonnet, Opus), ich statystyki (runs, success rate, avg duration, cost per run), umożliwia inline edycję ceny tokena i monitoring toggle per model, oraz pokazuje wykres użycia z 7d/30d toggle. Strona jest dostępna wyłącznie dla roli `admin` i daje Mariuszowi pełen wgląd w koszty i wydajność poszczególnych modeli.

## 🎯 CEL BIZNESOWY

Mariusz widzi w jednym miejscu ile każdy model kosztował w ostatnim miesiącu i który ma najlepszy stosunek cost/success_rate — co pozwala mu optymalizować routing stories do modeli.

## 👤 PERSONA

**Mariusz (Admin)** — developer zarządzający pipeline'm Kiry. Chce wiedzieć: który model jest najdroższy, który ma najwyższy success rate, gdzie jest bottleneck. Occasionally edytuje ceny tokenów gdy zmienią się taryfy Anthropic/OpenAI.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: Bridge API proxy, React Pages scaffold (`pages/_shared/`, Vite build infra)
- EPIC-3: Auth guard — strona wymaga roli `admin`

### Blokuje (ten epic odblokowuje):
- EPIC-6: Pipeline page może linkować do Models page z detail modelu (przyszła integracja)

## 📦 ZAKRES (In Scope)

- **Lista modeli** — konsumuje `GET /api/bridge/status/models` → karty per model: nazwa, provider, ikona, current status (aktywny/nieaktywny), monitoring toggle; modele z Bridge: Codex 5.3, Kimi K2.5, GLM-5, Haiku 4.5, Sonnet 4.6, Opus 4.6
- **Per-model stats** — dla każdego modelu: total runs (7d/30d toggle), success rate %, avg duration w sekundach, total cost USD, cost per run avg; dane z `GET /api/bridge/status/runs?model=<name>&days=<n>`
- **Inline cost editing** — kliknięcie w cenę tokena → inline input z $ per 1M tokens (in/out osobno); save → `PATCH /api/models/config/:name` → aktualizuje `models_config.json` lokalnie; zmiany wpływają na przyszłe cost calculations
- **Usage chart** — Recharts line chart: runs per dzień dla każdego modelu (ostatnie 7 lub 30 dni); multi-line (każdy model inny kolor); toggle 7d/30d; Beszel-inspired time-series chart z range selection
- **Monitoring toggle** — switch per model: gdy off → Bridge nie routuje nowych stories do tego modelu; `POST /api/bridge/models/:name/toggle-monitoring`
- **Model detail modal** — kliknięcie w kartę modelu → modal z pełną historią runów (tabela), top stories przez ten model, error rate breakdown, recent failures list

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Zarządzanie API keys modeli** — klucze są w `.env` na serwerze; edycja przez Settings page (EPIC-10), nie Models page
- **Dodawanie nowych modeli** — modele są konfigurowalne przez `bridge.yml`, nie przez UI (to potencjalnie future)
- **A/B testing modeli** — porównywanie modeli na tym samym zadaniu to future feature

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Strona `/pages/models/` ładuje się dla roli `admin`; niezalogowany lub rola `home` → redirect na dashboard
- [ ] Lista modeli pokazuje wszystkie skonfigurowane modele z Bridge z poprawnym success rate i total cost
- [ ] Inline edycja ceny tokena: zmiana wartości → save → przeładowanie strony pokazuje nową cenę; cost calculations się aktualizują
- [ ] Usage chart wyświetla runs per dzień dla wszystkich modeli z toggle 7d/30d (Recharts)
- [ ] Monitoring toggle: wyłączenie modelu → Bridge API akceptuje zmianę; po reload model widoczny jako nieaktywny
- [ ] Model detail modal otwiera się po kliknięciu karty z listą ostatnich 20 runów i error breakdown

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-5.1 | backend | Models config API — GET stats + PATCH cost config + toggle monitoring | Endpointy `GET /api/models/stats?days=N`, `PATCH /api/models/config/:name` (cost per token), `POST /api/bridge/models/:name/toggle-monitoring` — proxy do Bridge + lokalny `models_config.json` |
| STORY-5.2 | wiring | Typy + API client dla Models module | Typy `ModelConfig`, `ModelStats`, `ModelRun`; serwis `modelsApi` w `_shared/lib/models-api.ts` |
| STORY-5.3 | frontend | Models list + per-model cards z stats | Komponent `ModelsList`: karty per model z success rate, avg duration, cost, monitoring toggle |
| STORY-5.4 | frontend | Usage chart + model detail modal | Komponent `ModelsUsageChart` (Recharts, 7d/30d toggle) + `ModelDetailModal` z run history tabelą |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | models |
| Priorytet | Should |
| Szacunek | M (3-4 dni) |
| Ryzyko | Niskie — dane z Bridge API, UI stosunkowo proste |
| Domeny | backend, wiring, frontend |
| Stack | React 19, Recharts, Tailwind, shadcn/ui (Card, Dialog, Switch, Input), better-sqlite3 |
| Inspiracje | Beszel (time-series chart z range, per-service cards) |
| Uwagi | `models_config.json` to nowy plik — koszt per token per model. Nie miesza się z `bridge.yml`. Beszel-inspired charts — lightweight Recharts zamiast Chart.js (React-friendly). |
