---
story_id: STORY-12.12
title: "API /api/models + /api/runs — Supabase-first (usuń Bridge-first fallback)"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: should
estimated_effort: 4h
depends_on: STORY-12.1, STORY-12.4
blocks: STORY-12.14
tags: [api, models, runs, supabase, migration]
---

## 🎯 User Story

**Jako** użytkownik dashboardu
**Chcę** żeby strona Models i lista Runs zawsze czytały z Supabase (nie Bridge-first)
**Żeby** strona działała na Vercelu i lokalnie z jednym źródłem prawdy

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `app/api/models/route.ts` — GET, hybryda Bridge + Supabase (STORY-5.1/5.9)
- `app/api/models/[alias]/route.ts` — PATCH koszty
- `app/api/models/[alias]/metrics/route.ts` — time-series
- `app/api/runs/route.ts` — GET, hybryda Bridge + Supabase

### Aktualne zachowanie
Oba endpointy: `fetchBridge()` → jeśli fail → Supabase fallback.
Problem: na Vercelu Bridge ZAWSZE failuje → fallback działa, ale wolno (podwójny request).

### Docelowe zachowanie
Supabase-first. Bridge fetch usunięty. Jedno źródło prawdy.

---

## ✅ Acceptance Criteria

### AC-1: GET /api/models czyta TYLKO z Supabase
GIVEN: request na Vercelu lub lokalnie
WHEN: GET /api/models
THEN: dane z `bridge_runs` (agregowane per model) — BEZ fetchBridge()

### AC-2: Statystyki modeli obliczone z bridge_runs
GIVEN: `bridge_runs` z 200 runami
WHEN: GET /api/models
THEN: per model: total_runs, success_rate, avg_duration, total_cost, total_tokens

### AC-3: GET /api/models/[alias]/metrics zwraca time-series z Supabase
GIVEN: zalogowany użytkownik
WHEN: GET /api/models/sonnet-4.6/metrics?days=7
THEN: tablica per dzień: { date, runs, success_rate, cost, tokens }

### AC-4: GET /api/runs czyta TYLKO z Supabase
GIVEN: request
WHEN: GET /api/runs?project=kira-dashboard&limit=50
THEN: runs z `bridge_runs` posortowane DESC po started_at

### AC-5: PATCH /api/models/[alias] zapisuje do Supabase (nie Bridge)
GIVEN: ADMIN
WHEN: PATCH /api/models/sonnet-4.6 z body `{ cost_per_1k_input: 0.003 }`
THEN: aktualizacja w tabeli konfiguracyjnej (lub nowa tabela `model_config`)

### AC-6: Usunięto import fetchBridge z endpointów models i runs
GIVEN: kod po migracji
WHEN: `grep fetchBridge app/api/models/ app/api/runs/`
THEN: 0 wyników

---

## ⚙️ Szczegóły Backend

### GET /api/models — nowa implementacja

```typescript
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const supabase = await createClient()

  // Agregacja per model z bridge_runs
  const { data: runs } = await supabase
    .from('bridge_runs')
    .select('model, status, duration_ms, tokens_in, tokens_out, cost_usd, started_at')
    .not('model', 'is', null)

  // Grupuj po model
  const modelMap = new Map<string, ModelStats>()
  for (const run of runs ?? []) {
    const key = run.model
    if (!modelMap.has(key)) {
      modelMap.set(key, {
        total_runs: 0, successful: 0, failed: 0,
        total_duration_ms: 0, total_cost: 0,
        total_tokens_in: 0, total_tokens_out: 0,
        last_run: null,
      })
    }
    const stats = modelMap.get(key)!
    stats.total_runs++
    if (run.status === 'SUCCESS') stats.successful++
    if (run.status === 'FAILED') stats.failed++
    stats.total_duration_ms += run.duration_ms ?? 0
    stats.total_cost += run.cost_usd ?? 0
    stats.total_tokens_in += run.tokens_in ?? 0
    stats.total_tokens_out += run.tokens_out ?? 0
    if (!stats.last_run || run.started_at > stats.last_run) {
      stats.last_run = run.started_at
    }
  }

  const models = Array.from(modelMap.entries()).map(([alias, stats]) => ({
    alias,
    provider: PROVIDER_MAP[alias] ?? 'Unknown',
    ...stats,
    success_rate: stats.total_runs > 0
      ? Math.round((stats.successful / stats.total_runs) * 100)
      : 0,
    avg_duration_ms: stats.total_runs > 0
      ? Math.round(stats.total_duration_ms / stats.total_runs)
      : 0,
  }))

  return NextResponse.json({ data: models })
}
```

### GET /api/models/[alias]/metrics — time-series

```typescript
export async function GET(request, { params }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { alias } = await params
  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '7')
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const supabase = await createClient()
  const { data: runs } = await supabase
    .from('bridge_runs')
    .select('status, duration_ms, tokens_in, tokens_out, cost_usd, started_at')
    .eq('model', alias)
    .gte('started_at', since)
    .order('started_at')

  // Grupuj per dzień
  const dayMap = new Map<string, DayStats>()
  // ... grupowanie i agregacja ...

  return NextResponse.json({ alias, days, metrics: Array.from(dayMap.values()) })
}
```

---

## ⚠️ Edge Cases

### EC-1: Model z 0 runów (nowy model dodany do config)
Scenariusz: model nigdy nie uruchomiony
Oczekiwane zachowanie: nie pojawia się w models list (lub pojawia z `total_runs: 0` jeśli jest w `KNOWN_MODEL_KEYS`)

### EC-2: Stary `fetchBridge` import jeszcze używany gdzie indziej
Scenariusz: usuwamy z models/runs, ale `lib/bridge.ts` nadal istnieje
Oczekiwane zachowanie: zachowaj `lib/bridge.ts` — mogą jeszcze używać inne endpointy. Cleanup w EPIC-13.

### EC-3: Duża ilość runs (>10k) — wolne agregacje
Scenariusz: zapytanie SELECT * z 10k+ runów do agregacji per model
Oczekiwane zachowanie: użyj Supabase RPC (PostgreSQL function) do agregacji server-side, lub materialized view. Dla MVP (<5k runs): JS agregacja OK.

---

## 🚫 Out of Scope
- Materialized views (performance optimization — EPIC-13)
- Model config tabela (PATCH koszty — przenieś do Supabase jeśli czas pozwala, inaczej EPIC-13)
- Usunięcie `lib/bridge.ts` (EPIC-13 cleanup)

---

## ✔️ Definition of Done
- [ ] GET /api/models czyta TYLKO z Supabase
- [ ] GET /api/models/[alias]/metrics time-series z Supabase
- [ ] GET /api/runs czyta TYLKO z Supabase
- [ ] `fetchBridge` usunięty z models + runs routes
- [ ] Frontend Models page ładuje dane na Vercelu
- [ ] Story review przez PO
