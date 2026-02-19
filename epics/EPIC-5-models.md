---
epic_id: EPIC-5
title: "Models Page — Rejestr i monitoring modeli AI"
module: models
status: draft
priority: should
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-5 dostarcza dedykowaną stronę `/dashboard/models` — centralny rejestr wszystkich modeli AI skonfigurowanych w systemie OpenClaw/Kira. Mariusz widzi pełną listę modeli z ich dostawcami, aliasami i cenami API (input/output per 1M tokenów), edytuje koszty bezpośrednio z UI bez modyfikowania kodu, monitoruje statystyki użycia per model (total runs, success rate, avg duration, total cost USD) oraz śledzi trendy wydatków i tokenów na wykresach time-series za ostatnie 7 lub 30 dni. Toggle per model pozwala wyłączyć monitorowanie modeli nieużywanych w bieżącym pipeline'ie.

## 🎯 CEL BIZNESOWY

Mariusz audytuje koszty i wydajność wszystkich modeli AI w jednym miejscu, a aktualizacja cen API (np. po zmianie cennika Anthropic) zajmuje < 30 sekund bezpośrednio z dashboardu — bez edytowania kodu i restartu aplikacji.

## 👤 PERSONA

**Mariusz (Admin)** — developer i architekt systemu Kira zarządzający pipeline'm z wieloma modelami AI. Potrzebuje wglądu w koszty per model, żeby optymalizować dobór modeli do zadań (np. Haiku dla prostych tasków, Sonnet dla review). Gdy dostawca zmienia ceny API, chce zaktualizować je w dashboardzie natychmiast. Dotychczas ceny są hardcoded w `config/model-costs.ts` — trzeba deployować żeby je zmienić.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-1 (STORY-1.1): Next.js projekt setup, Bridge API client (`fetchBridge()`), sidebar layout — fundamenty projektu
- EPIC-1 (STORY-1.2): Typ `Run`, `BridgeRunRaw` i hook `useRuns()` — statystyki modeli obliczane z danych runów
- `config/model-costs.ts`: Istniejąca konfiguracja kosztów — STORY-5.2 rozszerza jej strukturę o runtime overrides

### Blokuje (ten epic odblokowuje):
- EPIC-6 (TBD): Advanced Analytics — porównanie wydajności modeli side-by-side wymaga danych z Models page
- Brak innych bezpośrednich blokerów

## 📦 ZAKRES (In Scope)

- **Lista modeli z Bridge API** — strona pobiera listę aktywnych modeli z Bridge `/api/status/models` (lub z konfiguracji bridge.yml) i łączy z lokalną konfiguracją kosztów z `model-costs.ts`
- **Karta per model** — dla każdego modelu wyświetla: nazwę (display name), provider (Anthropic / Moonshot / Z.AI / OpenAI), alias (klucz Bridge np. `kimi`, `sonnet`), model ID (np. `claude-sonnet-4-6`), koszty input/output per 1M tokenów
- **Statystyki per model** — obliczane z Bridge `/api/status/runs`: total runs, success rate (DONE/total), avg duration (sekundy), total cost USD (na podstawie tokenów i cen)
- **Edycja kosztów inline** — kliknięcie ceny otwiera formularz edycji (React Hook Form + Zod), zapis wysyła `PATCH /api/models/[alias]`, persystencja w konfiguracji server-side (runtime overrides w pamięci + opcjonalnie plik); walidacja: liczba ≥ 0
- **Wykres wydatki/tokeny w czasie** — line chart (Chart.js) per model za ostatnie 7 lub 30 dni, dane z Bridge metric_points; toggle 7d/30d; dwie serie: cost USD (lewa oś) i tokens count (prawa oś)
- **Monitoring toggle** — przełącznik aktywny/nieaktywny per model; wyłączony model nie pojawia się w Cost Tracker i analitykach; persystencja w localStorage; optimistic UI z rollback
- **Stany widoku** — loading (skeleton), empty (brak modeli w Bridge), offline (Bridge niedostępny z retry), filled (dane załadowane)
- **Nawigacja** — Models page dostępna z sidebar w sekcji "Pipeline" lub nowy wpis "Models" w nav

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Dodawanie / usuwanie modeli** — konfiguracja modeli odbywa się przez `bridge.yml` i plik `model-costs.ts`; dashboard jest read+limited-edit, nie configuration manager
- **Benchmarking i porównanie modeli** — zestawienie modeli side-by-side z metrykami jakości kodu (EPIC-6 Analytics)
- **Zarządzanie API keys per model** — klucze API przechowywane w `auth-profiles.json` systemu OpenClaw, poza zakresem dashboardu
- **Real-time live updates (SSE)** — strona Models odświeża dane co 60s (polling); SSE dla tego widoku nie wnosi dużej wartości (dane historyczne, nie live events)
- **Eksport danych** — eksport CSV/JSON statystyk modeli może być w EPIC-6

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Strona `/dashboard/models` ładuje listę modeli z Bridge API lub konfiguracji i wyświetla je w < 3 sekundy
- [ ] Dla każdego modelu widoczne są: nazwa, provider, alias, aktualne ceny input/output per 1M tokenów
- [ ] Statystyki (total runs, success rate, avg duration, total cost USD) obliczane są z rzeczywistych danych `/api/status/runs` — nie mocka
- [ ] Edycja ceny modelu przez UI zapisuje zmianę i wyświetla ją natychmiast bez przeładowania strony
- [ ] Wykres time-series wyświetla dane za 7 dni po kliknięciu "7d" i za 30 dni po kliknięciu "30d" dla wybranego modelu
- [ ] Toggle "monitoruj" wyłącza model natychmiast (optimistic UI) i stan jest zapamiętany po odświeżeniu strony
- [ ] Bridge offline: strona pokazuje stan offline z przyciskiem "Spróbuj ponownie" — nie crashuje
- [ ] Strona działa poprawnie przy Bridge zwracającym pustą listę modeli (empty state z komunikatem)

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-5.1 | backend | `GET /api/models` — proxy lista modeli z Bridge + konfiguracji | Endpoint pobiera listę modeli z Bridge `/api/status/models`, łączy z `model-costs.ts` i oblicza statystyki z ostatnich runów |
| STORY-5.2 | backend | `PATCH /api/models/[alias]` — edycja konfiguracji modelu | Endpoint aktualizuje ceny input/output per 1M dla wskazanego aliasu, z walidacją Zod i persystencją runtime overrides |
| STORY-5.3 | backend | `GET /api/models/[alias]/metrics` — time-series z Bridge metric_points | Endpoint agreguje metric_points z Bridge za 7 lub 30 dni dla jednego modelu, zwraca dzienne punkty cost USD + token count |
| STORY-5.4 | wiring | Typy TypeScript i hooki SWR dla modeli | Definicja typów `ModelEntry`, `ModelStats`, `ModelMetricPoint`, `ModelMetricsResponse` + hooki `useModels()` i `useModelMetrics(alias, period)` |
| STORY-5.5 | frontend | Models page `/dashboard/models` — grid kart z statystykami | Strona z tabelą/gridem kart modeli obsługująca 4 stany widoku (loading skeleton, empty, offline, filled) z stat badges per karta |
| STORY-5.6 | frontend | Model detail panel — wykres time-series + edycja kosztów inline | Rozwijany panel per model z Chart.js line chart (toggle 7d/30d), formularzem edycji cen (React Hook Form + Zod) i potwierdzeniem zapisu |
| STORY-5.7 | frontend | Monitoring toggle per model z optimistic UI | Przełącznik aktywności monitorowania modelu z natychmiastową zmianą stanu w UI, persystencją w localStorage i rollback przy błędzie |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | models |
| Priorytet | Should |
| Szacunek | M (3–7 dni) |
| Ryzyko | Niskie — Bridge `/api/status/models` może nie istnieć (fallback: lista z `model-costs.ts`); brak nowej tabeli DB eliminuje migracje |
| Domeny | backend, wiring, frontend |
| Stack | Next.js 16, shadcn/ui, Tailwind CSS, Chart.js, React Hook Form, Zod, SWR, TypeScript |
| DB | Brak własnej — dane z Bridge API (`/api/status/models`, `/api/status/runs`, metric_points) |
| Bridge API | GET `/api/status/models` [❓WYMAGA WYJAŚNIENIA — czy endpoint istnieje lub trzeba dodać do Bridge], GET `/api/status/runs`, metric_points endpoint |
| Konfiguracja | `config/model-costs.ts` — rozszerzona o runtime overrides; aliasy z `MODEL_ALIAS_MAP` |
| Design | Schemat kolorów: tło `#0d0c1a`, karty `#1a1730`, border `#2a2540`, akcent `#818cf8`; spójny z istniejącymi komponentami `ModelCard.tsx`, `CostTrackerPanel.tsx` |
| Route | `/dashboard/models` (w grupie `(dashboard)`) |
| Uwagi | Jeśli Bridge nie ma `/api/status/models`, STORY-5.1 generuje listę modeli ze statycznych kluczy z `KNOWN_MODEL_KEYS` + ich aliasów z `MODEL_ALIAS_MAP` — bez callowania Bridge dla samej listy. Statystyki nadal z `/api/status/runs`. |

---

## 📐 SZCZEGÓŁY TECHNICZNE (dla implementatora)

### STORY-5.1 — logika agregacji

```typescript
// GET /api/models
// 1. Pobierz modele: fetchBridge('/api/status/models') — jeśli null, użyj KNOWN_MODEL_KEYS
// 2. Pobierz runy: fetchBridge('/api/status/runs') — jeśli null, stats = null
// 3. Per model: oblicz stats z runów (filter by resolveModelKey(r.model) === key)
// 4. Zwróć: ModelEntry[] z polami config + stats

interface ModelEntry {
  alias: string            // klucz Bridge, np. "kimi", "sonnet"
  canonical_key: string   // np. "kimi-k2.5", "sonnet-4.6"
  display_name: string    // np. "Kimi K2.5", "Claude Sonnet 4.6"
  provider: string        // np. "Moonshot AI", "Anthropic"
  model_id: string        // np. "claude-sonnet-4-6" — z Bridge config lub null
  cost_input_per_1m: number   // USD, z model-costs.ts + runtime override
  cost_output_per_1m: number  // USD, z model-costs.ts + runtime override
  monitoring_enabled: boolean  // z persystencji (domyślnie: true)
  stats: ModelStats | null    // null gdy Bridge offline
}

interface ModelStats {
  total_runs: number
  success_rate: number    // 0.0–1.0
  avg_duration_s: number | null
  total_cost_usd: number
  last_run_at: string | null
}
```

### STORY-5.2 — persystencja kosztów

Endpoint `PATCH /api/models/[alias]` używa in-memory Map jako runtime override store (singleton w module Next.js). Przy restarcie serwera wartości są resetowane do `model-costs.ts` defaults.

[❓WYMAGA WYJAŚNIENIA — czy Bridge ma endpoint do persystencji config modeli, który mógłby zastąpić in-memory store]

Request body (Zod schema):
```typescript
z.object({
  cost_input_per_1m: z.number().min(0).max(1000).optional(),
  cost_output_per_1m: z.number().min(0).max(1000).optional(),
})
```

### STORY-5.3 — metric_points

Bridge przechowuje `metric_points` w SQLite. Zakładany endpoint:
`GET /api/metrics/models/[alias]?period=7d|30d`

Zwraca agregaty dzienne. Jeśli Bridge nie ma tego endpointu — STORY-5.3 oblicza time-series z runów per dzień (z `/api/status/runs` filtrowanego po `model` i `started_at`).

```typescript
interface ModelMetricPoint {
  date: string        // "YYYY-MM-DD"
  cost_usd: number    // suma kosztów w danym dniu
  tokens_in: number   // suma tokenów wejściowych
  tokens_out: number  // suma tokenów wyjściowych
  runs: number        // liczba runów w danym dniu
}

interface ModelMetricsResponse {
  alias: string
  period: '7d' | '30d'
  points: ModelMetricPoint[]  // posortowane ASC po date, uzupełnione zerami
}
```

### STORY-5.5 — układ strony

```
/dashboard/models
├── Header: "Models" + badge z liczbą modeli
├── Grid 2-col (desktop) / 1-col (mobile):
│   └── ModelCard per model:
│       ├── Header: ikona providera + nazwa + alias badge + monitoring toggle
│       ├── Stat row: [Runs] [Success%] [Avg duration] [Total cost]
│       ├── Cost row: Input: $X.XX / 1M   Output: $X.XX / 1M   [Edytuj]
│       └── [Expand ▼] → otwiera detail panel
└── Empty/Offline states
```

### STORY-5.6 — detail panel

Panel rozwijany pod kartą modelu (accordion, nie modal):
```
├── Period toggle: [7d] [30d]
├── Chart.js LineChart:
│   ├── Seria 1: Cost USD (lewa oś, kolor #818cf8)
│   └── Seria 2: Tokens (k) (prawa oś, kolor #4ade80)
├── Edit cost form (React Hook Form):
│   ├── Input: "Cost input / 1M tokens: $___"
│   ├── Input: "Cost output / 1M tokens: $___"
│   └── Buttons: [Zapisz] [Anuluj]
└── Recent runs mini-list (ostatnie 5 runów tego modelu)
```

### STORY-5.7 — monitoring toggle

Toggle stan w localStorage pod kluczem `kira_model_monitoring`:
```typescript
// Record<canonical_key, boolean> — default: true dla wszystkich modeli
const monitoringState = { 'kimi-k2.5': true, 'glm-5': false, ... }
```

Gdy `monitoring_enabled = false`:
- Karta modelu pokazuje dimmed style + "Wyłączony" badge
- Model **nie** pojawia się w Cost Tracker (EPIC-1 CostTrackerPanel filtruje)
- Model **nie** jest uwzględniany w stat cards na Overview page

[❓WYMAGA WYJAŚNIENIA — czy "wyłącz monitorowanie" ma też efekt po stronie Bridge (np. przestać zliczać metric_points dla modelu), czy tylko efekt w UI dashboardu]
