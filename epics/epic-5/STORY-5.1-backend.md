---
story_id: STORY-5.1
title: "GET /api/models — proxy lista modeli z Bridge + obliczone statystyki"
epic: EPIC-5
module: models
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 4h
depends_on: none
blocks: [STORY-5.4, STORY-5.5]
tags: [api, bridge, models, statistics, next.js, typescript, auth, supabase]
---

## 🎯 User Story

**Jako** aplikacja frontendowa kira-dashboard
**Chcę** mieć endpoint `GET /api/models` który zwraca listę modeli AI z obliczonymi statystykami
**Żeby** strona `/dashboard/models` mogła wyświetlić status, koszty i wskaźniki wydajności każdego modelu w oparciu o rzeczywiste dane z Bridge

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
app/api/models/route.ts   → eksportuj GET
```

Stack:
- Next.js 16 App Router (route handler)
- `fetchBridge<T>()` z `lib/bridge.ts` — jedyne miejsce do komunikacji z Bridge
- `MODEL_COSTS`, `KNOWN_MODEL_KEYS`, `MODEL_ALIAS_MAP`, `resolveModelKey()`, `calcTokenCost()` z `config/model-costs.ts`
- Supabase JWT do weryfikacji roli ADMIN
- TypeScript (strict mode)

### Powiązane pliki

- `lib/bridge.ts` — eksportuje `fetchBridge<T>(path)` zwracające `T | null` (null = Bridge offline)
- `config/model-costs.ts` — zawiera:
  - `MODEL_COSTS: Record<string, ModelCostConfig>` — ceny per model
  - `KNOWN_MODEL_KEYS = ['kimi-k2.5', 'glm-5', 'sonnet-4.6', 'codex-5.3']`
  - `MODEL_ALIAS_MAP: Record<string, string>` — aliasy do kluczy kanonicznych
  - `resolveModelKey(model: string): string | null` — rozwiązuje dowolny string na klucz kanoniczny
  - `calcTokenCost(modelKey, inputTokens, outputTokens): number` — oblicza koszt USD
  - `ModelCostConfig { input: number, output: number, displayName: string, color: string }`
- `lib/model-overrides.ts` — (tworzy STORY-5.2) singleton Map z runtime override kosztów; jeśli plik nie istnieje, użyj `MODEL_COSTS` bezpośrednio
- `types/bridge.ts` — zawiera `BridgeRunRaw { run_id, story_id, step, worker, model, status, started_at, ended_at, duration_ms, retry_count, tokens_in, tokens_out, cost_usd, artifacts }` i `RunsResponse { runs: BridgeRunRaw[] }`

### Stan systemu przed tą story

- `fetchBridge()` działa i zwraca `null` gdy Bridge offline (timeout 5s, retry 1x)
- `config/model-costs.ts` istnieje z 4 modelami: `kimi-k2.5`, `glm-5`, `sonnet-4.6`, `codex-5.3`
- Auth Supabase działa — endpoint musi sprawdzić JWT i rolę ADMIN
- `lib/model-overrides.ts` może nie istnieć jeszcze — endpoint musi działać bez niego (fallback do `MODEL_COSTS`)

### Kontrakty danych

Bridge `GET /api/status/models` — może zwrócić tablicę obiektów lub nie istnieć (404 → `fetchBridge` zwraca null).
Bridge `GET /api/status/runs` — zwraca `RunsResponse { runs: BridgeRunRaw[] }` lub null gdy offline.

Znane modele i ich metadane (z `config/model-costs.ts`):

| canonical_key | alias     | display_name   | provider      | model_id                |
|--------------|-----------|----------------|---------------|-------------------------|
| kimi-k2.5    | kimi      | Kimi K2.5      | Moonshot AI   | null                    |
| glm-5        | glm       | GLM-5          | Z.AI          | null                    |
| sonnet-4.6   | sonnet    | Sonnet 4.6     | Anthropic     | claude-sonnet-4-6       |
| codex-5.3    | codex     | Codex 5.3      | OpenAI        | null                    |

Provider mapping (hardcoded w route.ts):
```typescript
const PROVIDER_MAP: Record<string, string> = {
  'kimi-k2.5': 'Moonshot AI',
  'glm-5': 'Z.AI',
  'sonnet-4.6': 'Anthropic',
  'codex-5.3': 'OpenAI',
}
const MODEL_ID_MAP: Record<string, string | null> = {
  'kimi-k2.5': null,
  'glm-5': null,
  'sonnet-4.6': 'claude-sonnet-4-6',
  'codex-5.3': null,
}
const ALIAS_SHORT_MAP: Record<string, string> = {
  'kimi-k2.5': 'kimi',
  'glm-5': 'glm',
  'sonnet-4.6': 'sonnet',
  'codex-5.3': 'codex',
}
```

---

## ✅ Acceptance Criteria

### AC-1: Zwraca 401 gdy brak JWT lub rola nie jest ADMIN

GIVEN: request do `GET /api/models` bez nagłówka Authorization lub z JWT użytkownika o roli innej niż ADMIN
WHEN: endpoint przetwarza request
THEN: endpoint zwraca HTTP 401 z body `{ "error": "Brak dostępu. Wymagana rola ADMIN." }`
AND: `Cache-Control` jest ustawiony na `no-store`
AND: żadne wywołanie `fetchBridge()` nie jest wykonywane

### AC-2: Zwraca pełną listę ModelEntry gdy Bridge online

GIVEN: Bridge jest online
AND: `GET /api/status/runs` zwraca `{ runs: [BridgeRunRaw, ...] }` z runami dla różnych modeli
AND: `lib/model-overrides.ts` nie istnieje lub nie ma overrides
WHEN: ADMIN wysyła `GET /api/models`
THEN: endpoint zwraca HTTP 200 z tablicą JSON zawierającą dokładnie 4 elementy (jeden per każdy klucz z `KNOWN_MODEL_KEYS`)
AND: każdy element ma pola: `alias` (string), `canonical_key` (string), `display_name` (string), `provider` (string), `model_id` (string | null), `cost_input_per_1m` (number), `cost_output_per_1m` (number), `monitoring_enabled` (boolean, default `true`), `stats` (obiekt lub null)
AND: `cost_input_per_1m` i `cost_output_per_1m` są wartościami z `MODEL_COSTS[canonical_key].input/output`
AND: `Cache-Control: no-store` jest ustawiony w nagłówkach response

### AC-3: Statystyki modelu obliczone z rzeczywistych runów

GIVEN: Bridge `GET /api/status/runs` zwraca 10 runów dla aliasu `kimi` (8 z `status: 'DONE'`, 2 z `status: 'FAILED'`)
AND: 6 z nich ma `tokens_in: 1000, tokens_out: 500` (pozostałe mają `tokens_in: null`)
AND: runy z `status: 'DONE'` mają `duration_ms: 3000` (każdy)
WHEN: ADMIN wysyła `GET /api/models`
THEN: element z `canonical_key: 'kimi-k2.5'` ma:
  - `stats.total_runs: 10`
  - `stats.success_rate: 0.8` (8/10 = 0.8)
  - `stats.avg_duration_s: 3.0` (3000ms / 1000)
  - `stats.total_cost_usd: 0.0` (ceny kimi są 0.0)
  - `stats.last_run_at` — ISO 8601 timestamp ostatniego runu (posortuj po `started_at` DESC i weź pierwszy)
AND: element z `canonical_key: 'sonnet-4.6'` (0 runów) ma `stats: { total_runs: 0, success_rate: 0, avg_duration_s: null, total_cost_usd: 0, last_run_at: null }`

### AC-4: Koszt runu obliczony przez calcTokenCost gdy run nie ma cost_usd

GIVEN: run dla modelu `sonnet` ma `tokens_in: 2000`, `tokens_out: 500`, `cost_usd: null`
AND: `MODEL_COSTS['sonnet-4.6']` = `{ input: 3.0, output: 15.0 }`
WHEN: endpoint oblicza `total_cost_usd` dla `sonnet-4.6`
THEN: koszt runu = `calcTokenCost('sonnet-4.6', 2000, 500)` = `(2000 * 3.0 + 500 * 15.0) / 1_000_000` = `0.0135 USD`
AND: `stats.total_cost_usd` dla `sonnet-4.6` wynosi `0.0135`

### AC-5: Fallback gdy Bridge offline — lista modeli z KNOWN_MODEL_KEYS, stats: null

GIVEN: Bridge jest offline — `fetchBridge('/api/status/runs')` zwraca `null`
WHEN: ADMIN wysyła `GET /api/models`
THEN: endpoint zwraca HTTP 200 z tablicą 4 elementów (jeden per każdy klucz z `KNOWN_MODEL_KEYS`)
AND: każdy element ma `stats: null`
AND: `cost_input_per_1m` i `cost_output_per_1m` są poprawne (z `MODEL_COSTS`)
AND: `monitoring_enabled: true` dla wszystkich
AND: HTTP status to 200 (nie 503)

---

## ⚙️ Szczegóły Backend

### Struktura pliku `app/api/models/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { fetchBridge } from '@/lib/bridge'
import {
  KNOWN_MODEL_KEYS,
  MODEL_COSTS,
  MODEL_ALIAS_MAP,
  resolveModelKey,
  calcTokenCost,
} from '@/config/model-costs'
import { RunsResponse, BridgeRunRaw } from '@/types/bridge'

// Auth helper — sprawdza JWT i rolę ADMIN przez Supabase
// import { createClient } from '@/lib/supabase/server'
```

### Logika GET (krok po kroku)

```
1. AUTH CHECK:
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) → return 401 { error: "Brak dostępu. Wymagana rola ADMIN." }
   // Sprawdź rolę ADMIN z user_metadata lub z tabeli user_roles
   const role = user.user_metadata?.role ?? null
   if (role !== 'ADMIN') → return 401 { error: "Brak dostępu. Wymagana rola ADMIN." }

2. POBIERZ RUNY:
   const runsData = await fetchBridge<RunsResponse>('/api/status/runs')
   const runs: BridgeRunRaw[] = runsData?.runs ?? []
   // runsData === null → Bridge offline → runs = [] → stats będą puste (nie null per model)
   // UWAGA: runs === [] oznacza że mamy dane (po prostu puste), NIE offline
   // Żeby rozróżnić: offline → runsData === null → per model stats będą null
   const bridgeOnline = runsData !== null

3. GRUPUJ RUNY PER MODEL:
   // Stwórz Record<canonical_key, BridgeRunRaw[]>
   const runsByModel: Record<string, BridgeRunRaw[]> = {}
   for (const run of runs) {
     const key = resolveModelKey(run.model)  // np. 'kimi' → 'kimi-k2.5'
     if (key === null) continue  // nieznany model → pomiń
     if (!runsByModel[key]) runsByModel[key] = []
     runsByModel[key].push(run)
   }

4. POBIERZ RUNTIME OVERRIDES (opcjonalnie):
   // Spróbuj zaimportować model-overrides, obsłuż brak modułu
   let overrides: Map<string, { input?: number; output?: number }> = new Map()
   try {
     const { modelOverrides } = await import('@/lib/model-overrides')
     overrides = modelOverrides
   } catch {
     // lib/model-overrides.ts nie istnieje — używamy defaults
   }

5. ZBUDUJ ModelEntry[] dla każdego z KNOWN_MODEL_KEYS:
   const result: ModelEntry[] = KNOWN_MODEL_KEYS.map((canonicalKey) => {
     const costConfig = MODEL_COSTS[canonicalKey]
     const override = overrides.get(canonicalKey)
     const modelRuns = runsByModel[canonicalKey] ?? []

     // Oblicz stats
     let stats: ModelStats | null = null
     if (bridgeOnline) {
       const totalRuns = modelRuns.length
       const doneRuns = modelRuns.filter(r => r.status === 'DONE')
       const successRate = totalRuns > 0 ? doneRuns.length / totalRuns : 0
       
       const durations = modelRuns
         .filter(r => r.duration_ms !== null)
         .map(r => r.duration_ms! / 1000)
       const avgDurationS = durations.length > 0
         ? durations.reduce((a, b) => a + b, 0) / durations.length
         : null
       
       const totalCostUsd = modelRuns.reduce((sum, r) => {
         if (r.cost_usd !== null) return sum + r.cost_usd
         if (r.tokens_in !== null && r.tokens_out !== null) {
           return sum + calcTokenCost(canonicalKey, r.tokens_in, r.tokens_out)
         }
         return sum
       }, 0)
       
       const sortedByDate = [...modelRuns]
         .filter(r => r.started_at)
         .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
       const lastRunAt = sortedByDate[0]?.started_at ?? null
       
       stats = { total_runs: totalRuns, success_rate: successRate, avg_duration_s: avgDurationS, total_cost_usd: totalCostUsd, last_run_at: lastRunAt }
     }
     
     return {
       alias: ALIAS_SHORT_MAP[canonicalKey],
       canonical_key: canonicalKey,
       display_name: costConfig.displayName,
       provider: PROVIDER_MAP[canonicalKey],
       model_id: MODEL_ID_MAP[canonicalKey],
       cost_input_per_1m: override?.input ?? costConfig.input,
       cost_output_per_1m: override?.output ?? costConfig.output,
       monitoring_enabled: true,   // domyślnie true; STORY-5.7 zarządza przez localStorage
       stats,
     }
   })

6. ZWRÓĆ RESPONSE:
   return NextResponse.json(result, {
     status: 200,
     headers: { 'Cache-Control': 'no-store' },
   })
```

### Obsługa błędów

```typescript
// Każdy handler ma try/catch na najwyższym poziomie
export async function GET(request: NextRequest) {
  try {
    // ... logika powyżej
  } catch (err) {
    console.error('[GET /api/models]', err)
    return NextResponse.json({ error: 'Błąd serwera — spróbuj ponownie' }, { status: 500 })
  }
}
```

### Typy odpowiedzi (zdefiniowane w route.ts lub importowane z types/models.ts po STORY-5.4)

```typescript
interface ModelEntry {
  alias: string
  canonical_key: string
  display_name: string
  provider: string
  model_id: string | null
  cost_input_per_1m: number
  cost_output_per_1m: number
  monitoring_enabled: boolean
  stats: ModelStats | null
}

interface ModelStats {
  total_runs: number
  success_rate: number       // 0.0–1.0
  avg_duration_s: number | null
  total_cost_usd: number
  last_run_at: string | null // ISO 8601
}
```

---

## ⚠️ Edge Cases

### EC-1: Bridge zwraca pustą tablicę runs `{ runs: [] }`
- `runsData` = `{ runs: [] }` (nie null) → `bridgeOnline = true`
- `runs = []` → `runsByModel` jest pusty
- Każdy model dostaje `stats = { total_runs: 0, success_rate: 0, avg_duration_s: null, total_cost_usd: 0, last_run_at: null }`
- Response: HTTP 200 z 4 modelami, każdy ze stats = zerami (nie null)

### EC-2: Bridge offline — `fetchBridge('/api/status/runs')` zwraca null
- `runsData = null` → `bridgeOnline = false`
- Każdy model dostaje `stats = null` (jawnie null, nie obiekt z zerami)
- Response: HTTP 200 z 4 modelami, każdy z `stats: null`

### EC-3: Model w runach nie pasuje do żadnego aliasu z MODEL_ALIAS_MAP
- `run.model = 'gpt-4o'` → `resolveModelKey('gpt-4o')` zwraca `null`
- Ten run jest pomijany w pętli (`continue`) — nie crash, nie error
- Pozostałe runy są przetwarzane normalnie

### EC-4: Run ma `tokens_in: null` (incomplete run)
- Warunek `r.tokens_in !== null && r.tokens_out !== null` jest false
- Ten run nie jest uwzględniany w `total_cost_usd` (suma = sum bez tego runu)
- Jeśli run ma `cost_usd: 5.0` — jest uwzględniany przez `r.cost_usd !== null`

---

## 🚫 Out of Scope tej Story

- Endpoint `PATCH /api/models/[alias]` — STORY-5.2
- Endpoint `GET /api/models/[alias]/metrics` — STORY-5.3
- Plik `lib/model-overrides.ts` — STORY-5.2 go tworzy; STORY-5.1 próbuje go zaimportować opcjonalnie
- Persystencja `monitoring_enabled` po stronie serwera — zarządzane przez localStorage (STORY-5.7)
- Sortowanie modeli inne niż kolejność z `KNOWN_MODEL_KEYS`
- Dodawanie nowych modeli poza `KNOWN_MODEL_KEYS`

---

## ✔️ Definition of Done

- [ ] Plik `app/api/models/route.ts` istnieje i eksportuje `GET`
- [ ] Endpoint zwraca 401 gdy user nie jest zalogowany lub nie ma roli ADMIN
- [ ] Endpoint zwraca HTTP 200 z dokładnie 4 elementami gdy Bridge online
- [ ] `stats` zawiera poprawnie obliczone: `total_runs`, `success_rate`, `avg_duration_s`, `total_cost_usd`, `last_run_at`
- [ ] `cost_usd` z runu ma priorytet nad obliczeniem z tokenów przy sumowaniu kosztów
- [ ] Gdy Bridge offline: 4 modele zwrócone z `stats: null`
- [ ] Nieznane modele w runach są pomijane bez błędu
- [ ] `Cache-Control: no-store` w każdej odpowiedzi
- [ ] TypeScript — brak `any`, wszystkie typy zdefiniowane
- [ ] Kod przechodzi `next build` bez błędów TypeScript
