---
story_id: STORY-5.3
title: "GET /api/models/[alias]/metrics — time-series kosztów i tokenów"
epic: EPIC-5
module: models
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 3h
depends_on: [STORY-5.1, STORY-5.2]
blocks: [STORY-5.4, STORY-5.6]
tags: [api, models, metrics, time-series, chart, bridge, aggregation, next.js, typescript]
---

## 🎯 User Story

**Jako** aplikacja frontendowa kira-dashboard
**Chcę** mieć endpoint `GET /api/models/[alias]/metrics?period=7d|30d` zwracający dzienne dane kosztów i tokenów
**Żeby** wykres time-series w panelu szczegółów modelu mógł pokazać trendy wydatków i zużycia tokenów za ostatnie 7 lub 30 dni

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
app/api/models/[alias]/metrics/route.ts   → eksportuj GET
```

Stack:
- Next.js 16 App Router (route handler, dynamiczny segment `[alias]`)
- `fetchBridge<T>()` z `lib/bridge.ts`
- `resolveModelKey()`, `calcTokenCost()` z `config/model-costs.ts`
- Supabase JWT do weryfikacji roli ADMIN
- TypeScript (strict mode)

### Powiązane pliki

- `lib/bridge.ts` — `fetchBridge<T>(path): Promise<T | null>`
- `config/model-costs.ts` — `resolveModelKey()`, `calcTokenCost()`
- `types/bridge.ts` — `BridgeRunRaw { run_id, story_id, model, status, started_at, ended_at, duration_ms, tokens_in, tokens_out, cost_usd }`, `RunsResponse { runs: BridgeRunRaw[] }`
- `app/api/models/[alias]/route.ts` — (STORY-5.2) ten sam dynamiczny segment, ten sam plik — dodaj `GET` handler lub utwórz osobny route w `metrics/route.ts`

### Kontrakty danych

**Próba Bridge metrics endpoint:**
`fetchBridge<BridgeMetricsResponse>('/api/metrics/models/{canonicalKey}?period=7d')`
- Jeśli zwróci `null` (Bridge offline lub 404) → użyj fallback z runów

**Fallback — Bridge runs:**
`fetchBridge<RunsResponse>('/api/status/runs')` — filtruj po modelu i dacie

### Format odpowiedzi

```typescript
interface ModelMetricPoint {
  date: string       // "YYYY-MM-DD" (strefa UTC)
  cost_usd: number   // suma kosztów w danym dniu (≥ 0)
  tokens_in: number  // suma tokenów wejściowych (≥ 0)
  tokens_out: number // suma tokenów wyjściowych (≥ 0)
  runs: number       // liczba runów w danym dniu (≥ 0)
}

interface ModelMetricsResponse {
  alias: string
  period: '7d' | '30d'
  points: ModelMetricPoint[]  // posortowane ASC po date, bez luk, długość = 7 lub 30
}
```

---

## ✅ Acceptance Criteria

### AC-1: Zwraca 401 gdy brak JWT lub rola nie ADMIN

GIVEN: request do `GET /api/models/sonnet/metrics?period=7d` bez JWT lub z JWT roli HELPER
WHEN: endpoint przetwarza request
THEN: endpoint zwraca HTTP 401 z body `{ "error": "Brak dostępu. Wymagana rola ADMIN." }`

### AC-2: Zwraca 404 gdy alias nieznany

GIVEN: ADMIN zalogowany
WHEN: `GET /api/models/nieznany-model/metrics?period=7d`
THEN: endpoint zwraca HTTP 404 z body:
```json
{ "error": "Model o aliasie 'nieznany-model' nie istnieje" }
```

### AC-3: Zwraca 400 gdy period jest nieprawidłowy

GIVEN: ADMIN zalogowany
WHEN: `GET /api/models/sonnet/metrics?period=90d`
THEN: endpoint zwraca HTTP 400 z body:
```json
{ "error": "Nieprawidłowy period. Dozwolone: 7d, 30d" }
```

GIVEN: ADMIN zalogowany
WHEN: `GET /api/models/kimi/metrics` (brak parametru period)
THEN: endpoint zwraca HTTP 400 z body:
```json
{ "error": "Nieprawidłowy period. Dozwolone: 7d, 30d" }
```

### AC-4: Zwraca ciągłą serię 7 punktów dla period=7d z runami

GIVEN: ADMIN zalogowany, Bridge online
AND: `fetchBridge('/api/status/runs')` zwraca 3 runy dla modelu `kimi` (`resolveModelKey('kimi') = 'kimi-k2.5'`):
  - run_1: `started_at: "2026-02-20T10:00:00Z"`, `status: 'DONE'`, `tokens_in: 1000`, `tokens_out: 500`, `cost_usd: null`
  - run_2: `started_at: "2026-02-20T15:00:00Z"`, `status: 'DONE'`, `tokens_in: 2000`, `tokens_out: 800`, `cost_usd: null`
  - run_3: `started_at: "2026-02-22T09:00:00Z"`, `status: 'FAILED'`, `tokens_in: null`, `tokens_out: null`, `cost_usd: null`
AND: today (UTC) = `2026-02-22`
WHEN: `GET /api/models/kimi/metrics?period=7d`
THEN: endpoint zwraca HTTP 200 z:
```json
{
  "alias": "kimi",
  "period": "7d",
  "points": [
    { "date": "2026-02-16", "cost_usd": 0, "tokens_in": 0, "tokens_out": 0, "runs": 0 },
    { "date": "2026-02-17", "cost_usd": 0, "tokens_in": 0, "tokens_out": 0, "runs": 0 },
    { "date": "2026-02-18", "cost_usd": 0, "tokens_in": 0, "tokens_out": 0, "runs": 0 },
    { "date": "2026-02-19", "cost_usd": 0, "tokens_in": 0, "tokens_out": 0, "runs": 0 },
    { "date": "2026-02-20", "cost_usd": 0, "tokens_in": 3000, "tokens_out": 1300, "runs": 2 },
    { "date": "2026-02-21", "cost_usd": 0, "tokens_in": 0, "tokens_out": 0, "runs": 0 },
    { "date": "2026-02-22", "cost_usd": 0, "tokens_in": 0, "tokens_out": 0, "runs": 1 }
  ]
}
```
AND: długość `points` = 7 (zawsze, dla period=7d)
AND: punkty posortowane ASC po `date`
AND: `run_3` (FAILED, null tokens) jest liczony w `runs: 1` dla daty `2026-02-22`, ale `tokens_in: 0` (bo null)

### AC-5: period=30d zwraca dokładnie 30 punktów

GIVEN: ADMIN zalogowany
WHEN: `GET /api/models/sonnet/metrics?period=30d`
THEN: `points` ma dokładnie 30 elementów
AND: `points[0].date` = today - 29 dni (UTC, format "YYYY-MM-DD")
AND: `points[29].date` = today (UTC)
AND: dni bez runów mają wszystkie wartości = 0

---

## ⚙️ Szczegóły Backend

### Logika GET (krok po kroku)

```
1. AUTH CHECK:
   Sprawdź JWT i rolę ADMIN (tak samo jak STORY-5.1)
   → brak ADMIN → 401 { error: "Brak dostępu. Wymagana rola ADMIN." }

2. ODCZYTAJ PARAMETRY:
   const { alias } = params
   const period = searchParams.get('period')
   if (period !== '7d' && period !== '30d')
     → return 400 { error: "Nieprawidłowy period. Dozwolone: 7d, 30d" }
   const canonicalKey = resolveModelKey(alias)
   if (canonicalKey === null)
     → return 404 { error: `Model o aliasie '${alias}' nie istnieje` }

3. ZBUDUJ ZAKRES DAT:
   const days = period === '7d' ? 7 : 30
   const today = new Date()
   today.setUTCHours(0, 0, 0, 0)
   // Generuj tablicę dat: today - (days-1) do today
   const dateRange: string[] = []
   for (let i = days - 1; i >= 0; i--) {
     const d = new Date(today)
     d.setUTCDate(d.getUTCDate() - i)
     dateRange.push(d.toISOString().slice(0, 10))  // "YYYY-MM-DD"
   }
   const startDate = new Date(dateRange[0] + 'T00:00:00Z')

4. SPRÓBUJ BRIDGE METRICS ENDPOINT:
   const bridgeMetrics = await fetchBridge<BridgeMetricsResponse>(
     `/api/metrics/models/${canonicalKey}?period=${period}`
   )
   if (bridgeMetrics !== null && Array.isArray(bridgeMetrics.points)) {
     // Bridge ma endpoint metrics — transformuj i uzupełnij brakujące dni
     const pointMap = new Map(bridgeMetrics.points.map(p => [p.date, p]))
     const points = dateRange.map(date => pointMap.get(date) ?? {
       date, cost_usd: 0, tokens_in: 0, tokens_out: 0, runs: 0,
     })
     return NextResponse.json({ alias: ALIAS_SHORT_MAP[canonicalKey], period, points }, { status: 200 })
   }

5. FALLBACK — OBLICZ Z RUNÓW:
   const runsData = await fetchBridge<RunsResponse>('/api/status/runs')
   if (runsData === null) {
     // Bridge offline — zwróć pustą serię (same zera)
     const points = dateRange.map(date => ({ date, cost_usd: 0, tokens_in: 0, tokens_out: 0, runs: 0 }))
     return NextResponse.json({ alias: ALIAS_SHORT_MAP[canonicalKey], period, points }, { status: 200 })
   }

   // Filtruj runy po modelu i dacie
   const modelRuns = runsData.runs.filter(r => {
     if (!r.started_at) return false
     const runKey = resolveModelKey(r.model)
     if (runKey !== canonicalKey) return false
     const runDate = new Date(r.started_at)
     return runDate >= startDate
   })

   // Agreguj per dzień
   const dayMap = new Map<string, { cost_usd: number; tokens_in: number; tokens_out: number; runs: number }>()
   for (const date of dateRange) {
     dayMap.set(date, { cost_usd: 0, tokens_in: 0, tokens_out: 0, runs: 0 })
   }
   for (const run of modelRuns) {
     const dateKey = run.started_at.slice(0, 10)  // "YYYY-MM-DD"
     if (!dayMap.has(dateKey)) continue  // spoza zakresu — pomiń
     const bucket = dayMap.get(dateKey)!
     bucket.runs += 1
     if (run.tokens_in !== null) bucket.tokens_in += run.tokens_in
     if (run.tokens_out !== null) bucket.tokens_out += run.tokens_out
     // Koszt: preferuj cost_usd z runu, fallback do kalkulacji z tokenów
     if (run.cost_usd !== null) {
       bucket.cost_usd += run.cost_usd
     } else if (run.tokens_in !== null && run.tokens_out !== null) {
       bucket.cost_usd += calcTokenCost(canonicalKey, run.tokens_in, run.tokens_out)
     }
   }

   // Zbuduj tablicę punktów posortowanych ASC
   const points = dateRange.map(date => ({
     date,
     ...dayMap.get(date)!,
   }))

6. ZWRÓĆ RESPONSE:
   return NextResponse.json(
     { alias: ALIAS_SHORT_MAP[canonicalKey], period, points },
     { status: 200, headers: { 'Cache-Control': 'no-store' } }
   )
```

### Obsługa błędów

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { alias: string } }
) {
  try {
    // ... logika powyżej
  } catch (err) {
    console.error('[GET /api/models/[alias]/metrics]', err)
    return NextResponse.json({ error: 'Błąd serwera — spróbuj ponownie' }, { status: 500 })
  }
}
```

---

## ⚠️ Edge Cases

### EC-1: Bridge offline — zarówno metrics jak i runs zwracają null
- `fetchBridge('/api/metrics/models/...')` → null
- `fetchBridge('/api/status/runs')` → null
- Response: HTTP 200 z `points` zawierającym same zera (7 lub 30 punktów)
- `alias`, `period` są poprawne w response

### EC-2: Run ma `started_at: null` → jest pomijany
- Run z `started_at: null` — warunek `if (!r.started_at) return false` wyklucza ten run
- Nie trafia do żadnego dnia — nie crash, nie dodaje do total

### EC-3: Run ma datę spoza zakresu (starszą niż period)
- `dateRange` zaczyna się od `today - (days-1)`; run sprzed 60 dni przy `period=7d`
- `dayMap.has(dateKey)` → false → `continue`
- Run jest ignorowany

### EC-4: Brak runów dla modelu w całym okresie
- `modelRuns` = `[]`
- Wszystkie buckety w `dayMap` mają wartości `0`
- Response: HTTP 200 z `points` zawierającym 7 lub 30 punktów, wszystkie wartości = 0
- **Nie** zwraca pustej tablicy `[]`

---

## 🚫 Out of Scope tej Story

- Agregacja per godzinę lub per tydzień (tylko per dzień)
- Eksport danych jako CSV
- Caching odpowiedzi (dane na żywo, `Cache-Control: no-store`)
- Filtrowanie po statusie runu (DONE/FAILED) — wszystkie runy są zliczane
- Endpoint dla listy wszystkich modeli metrics jednocześnie (`/api/models/metrics`)

---

## ✔️ Definition of Done

- [ ] Plik `app/api/models/[alias]/metrics/route.ts` istnieje i eksportuje `GET`
- [ ] Endpoint zwraca 401 gdy brak ADMIN JWT
- [ ] Endpoint zwraca 404 gdy alias nieznany (`"Model o aliasie '...' nie istnieje"`)
- [ ] Endpoint zwraca 400 gdy `period` ≠ `7d` i ≠ `30d` (`"Nieprawidłowy period. Dozwolone: 7d, 30d"`)
- [ ] `period=7d` → `points` ma zawsze dokładnie 7 elementów
- [ ] `period=30d` → `points` ma zawsze dokładnie 30 elementów
- [ ] Punkty posortowane ASC po `date`, bez luk
- [ ] Dni bez runów mają `cost_usd: 0, tokens_in: 0, tokens_out: 0, runs: 0`
- [ ] Runy z `started_at: null` są pomijane
- [ ] Bridge offline → pusta seria z zerami (nie error)
- [ ] `Cache-Control: no-store` w nagłówkach
- [ ] TypeScript — brak `any`, wszystkie typy zdefiniowane
- [ ] Kod przechodzi `next build` bez błędów
