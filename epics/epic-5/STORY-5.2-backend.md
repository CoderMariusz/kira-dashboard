---
story_id: STORY-5.2
title: "PATCH /api/models/[alias] — edycja konfiguracji kosztów modelu"
epic: EPIC-5
module: models
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-5.1]
blocks: [STORY-5.6]
tags: [api, models, patch, zod, in-memory, override, next.js, typescript]
---

## 🎯 User Story

**Jako** Mariusz (ADMIN)
**Chcę** móc zaktualizować ceny input/output per 1M tokenów dla wybranego modelu AI
**Żeby** dashboard natychmiast odzwierciedlał nowy cennik bez edytowania kodu i deployowania aplikacji

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Pliki do stworzenia:
```
app/api/models/[alias]/route.ts   → eksportuj PATCH
lib/model-overrides.ts            → singleton Map z runtime overrides
```

Stack:
- Next.js 16 App Router (route handler, dynamiczny segment `[alias]`)
- Zod do walidacji body
- In-memory Map jako runtime override store
- Supabase JWT do weryfikacji roli ADMIN
- TypeScript (strict mode)

### Powiązane pliki

- `config/model-costs.ts` — `MODEL_COSTS`, `KNOWN_MODEL_KEYS`, `MODEL_ALIAS_MAP`, `ModelCostConfig`, `resolveModelKey()`
- `lib/bridge.ts` — `fetchBridge()` (potrzebny do zwrócenia zaktualizowanego `ModelEntry`)
- `app/api/models/route.ts` — logika budowania `ModelEntry` (STORY-5.1); PATCH zwraca ten sam format
- `types/bridge.ts` — `BridgeRunRaw`, `RunsResponse`

### Stan systemu przed tą story

- STORY-5.1 ukończona — `GET /api/models` działa
- `config/model-costs.ts` istnieje

### Persystencja runtime overrides

Plik `lib/model-overrides.ts` — singleton Map w module Next.js:

```typescript
// lib/model-overrides.ts
// In-memory store dla runtime overrides kosztów modeli.
// UWAGA: Jest resetowany przy każdym restarcie serwera Next.js.
// Wartości domyślne: brak wpisów (= używaj MODEL_COSTS z config/model-costs.ts)

export interface ModelCostOverride {
  cost_input_per_1m: number
  cost_output_per_1m: number
}

// Singleton — jeden obiekt na cały proces Node.js
const store = new Map<string, ModelCostOverride>()
export const modelOverrides = store
```

Gdy STORY-5.1 importuje `modelOverrides` — dostaje tę samą instancję Map.

---

## ✅ Acceptance Criteria

### AC-1: PATCH aktualizuje cost_input_per_1m i zwraca zaktualizowany ModelEntry

GIVEN: ADMIN jest zalogowany (ważny JWT, rola ADMIN)
AND: alias `sonnet` istnieje w `MODEL_ALIAS_MAP` (mapuje na `sonnet-4.6`)
AND: domyślna cena `MODEL_COSTS['sonnet-4.6'].input = 3.0`
WHEN: ADMIN wysyła `PATCH /api/models/sonnet` z body `{ "cost_input_per_1m": 5.0 }`
THEN: endpoint zwraca HTTP 200 z pełnym obiektem `ModelEntry`:
```json
{
  "alias": "sonnet",
  "canonical_key": "sonnet-4.6",
  "display_name": "Sonnet 4.6",
  "provider": "Anthropic",
  "model_id": "claude-sonnet-4-6",
  "cost_input_per_1m": 5.0,
  "cost_output_per_1m": 15.0,
  "monitoring_enabled": true,
  "stats": null
}
```
AND: `modelOverrides.get('sonnet-4.6')` = `{ cost_input_per_1m: 5.0, cost_output_per_1m: 15.0 }`
AND: kolejny `GET /api/models` zwraca `cost_input_per_1m: 5.0` dla `sonnet-4.6`

### AC-2: PATCH aktualizuje oba pola jednocześnie

GIVEN: ADMIN zalogowany
AND: alias `kimi` mapuje na `kimi-k2.5`
WHEN: ADMIN wysyła `PATCH /api/models/kimi` z body `{ "cost_input_per_1m": 1.5, "cost_output_per_1m": 3.0 }`
THEN: endpoint zwraca HTTP 200 z `cost_input_per_1m: 1.5` i `cost_output_per_1m: 3.0`
AND: `modelOverrides.get('kimi-k2.5')` = `{ cost_input_per_1m: 1.5, cost_output_per_1m: 3.0 }`

### AC-3: Alias nieznany → 404 z komunikatem

GIVEN: ADMIN zalogowany
WHEN: ADMIN wysyła `PATCH /api/models/nieznany-model` z body `{ "cost_input_per_1m": 1.0 }`
THEN: endpoint zwraca HTTP 404 z body:
```json
{ "error": "Model o aliasie 'nieznany-model' nie istnieje" }
```
AND: `modelOverrides` nie jest modyfikowany

### AC-4: Puste body → 400 z komunikatem

GIVEN: ADMIN zalogowany
WHEN: ADMIN wysyła `PATCH /api/models/sonnet` z body `{}`
THEN: endpoint zwraca HTTP 400 z body:
```json
{ "error": "Podaj co najmniej jedno pole do aktualizacji" }
```

### AC-5: Brak JWT lub rola nie ADMIN → 401

GIVEN: request bez JWT lub z JWT użytkownika o roli HELPER
WHEN: PATCH `/api/models/sonnet` z body `{ "cost_input_per_1m": 5.0 }`
THEN: endpoint zwraca HTTP 401 z body `{ "error": "Brak dostępu. Wymagana rola ADMIN." }`
AND: `modelOverrides` nie jest modyfikowany

---

## ⚙️ Szczegóły Backend

### Walidacja Zod

```typescript
import { z } from 'zod'

const PatchModelBodySchema = z.object({
  cost_input_per_1m: z.number()
    .min(0, 'Cena nie może być ujemna')
    .max(1000, 'Cena nie może przekraczać 1000 USD')
    .optional(),
  cost_output_per_1m: z.number()
    .min(0, 'Cena nie może być ujemna')
    .max(1000, 'Cena nie może przekraczać 1000 USD')
    .optional(),
}).refine(
  (data) => data.cost_input_per_1m !== undefined || data.cost_output_per_1m !== undefined,
  { message: 'Podaj co najmniej jedno pole do aktualizacji' }
)
```

### Logika PATCH (krok po kroku)

```
1. AUTH CHECK:
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user || user.user_metadata?.role !== 'ADMIN')
     → return 401 { error: "Brak dostępu. Wymagana rola ADMIN." }

2. ODCZYTAJ ALIAS Z URL:
   const { alias } = params  // Next.js dynamiczny segment
   // Sprawdź czy alias istnieje w MODEL_ALIAS_MAP
   const canonicalKey = resolveModelKey(alias)
   if (canonicalKey === null)
     → return 404 { error: `Model o aliasie '${alias}' nie istnieje` }

3. PARSUJ I WALIDUJ BODY:
   let body: unknown
   try { body = await request.json() } catch { return 400 { error: "Nieprawidłowy JSON" } }
   const parsed = PatchModelBodySchema.safeParse(body)
   if (!parsed.success) {
     // Wyciągnij pierwszy komunikat błędu z Zod
     const message = parsed.error.errors[0]?.message ?? 'Nieprawidłowe dane'
     return 400 { error: message }
   }

4. ZASTOSUJ OVERRIDE:
   const { modelOverrides } = await import('@/lib/model-overrides')
   const costConfig = MODEL_COSTS[canonicalKey]
   const existing = modelOverrides.get(canonicalKey)
   const newOverride = {
     cost_input_per_1m: parsed.data.cost_input_per_1m ?? existing?.cost_input_per_1m ?? costConfig.input,
     cost_output_per_1m: parsed.data.cost_output_per_1m ?? existing?.cost_output_per_1m ?? costConfig.output,
   }
   modelOverrides.set(canonicalKey, newOverride)

5. ZBUDUJ I ZWRÓĆ ZAKTUALIZOWANY ModelEntry:
   // Pobierz stats z Bridge (opcjonalnie — może być null jeśli offline)
   const runsData = await fetchBridge<RunsResponse>('/api/status/runs')
   // ... oblicz stats tak samo jak w STORY-5.1
   const entry: ModelEntry = {
     alias: ALIAS_SHORT_MAP[canonicalKey],
     canonical_key: canonicalKey,
     display_name: costConfig.displayName,
     provider: PROVIDER_MAP[canonicalKey],
     model_id: MODEL_ID_MAP[canonicalKey],
     cost_input_per_1m: newOverride.cost_input_per_1m,
     cost_output_per_1m: newOverride.cost_output_per_1m,
     monitoring_enabled: true,
     stats,
   }
   return NextResponse.json(entry, { status: 200 })
```

### Stała mapowania (powiel z STORY-5.1 lub wydziel do lib)

```typescript
// Identyczne jak w STORY-5.1 — rozważ wydzielenie do lib/model-meta.ts
const PROVIDER_MAP: Record<string, string> = { 'kimi-k2.5': 'Moonshot AI', 'glm-5': 'Z.AI', 'sonnet-4.6': 'Anthropic', 'codex-5.3': 'OpenAI' }
const ALIAS_SHORT_MAP: Record<string, string> = { 'kimi-k2.5': 'kimi', 'glm-5': 'glm', 'sonnet-4.6': 'sonnet', 'codex-5.3': 'codex' }
const MODEL_ID_MAP: Record<string, string | null> = { 'kimi-k2.5': null, 'glm-5': null, 'sonnet-4.6': 'claude-sonnet-4-6', 'codex-5.3': null }
```

---

## ⚠️ Edge Cases

### EC-1: Wartość ujemna w body
- `PATCH /api/models/sonnet` z body `{ "cost_input_per_1m": -1 }`
- Zod `.min(0, 'Cena nie może być ujemna')` odrzuca
- Response: HTTP 400 `{ "error": "Cena nie może być ujemna" }`
- `modelOverrides` nie jest modyfikowany

### EC-2: Wartość przekraczająca 1000 USD
- `PATCH /api/models/kimi` z body `{ "cost_output_per_1m": 1001 }`
- Zod `.max(1000, 'Cena nie może przekraczać 1000 USD')` odrzuca
- Response: HTTP 400 `{ "error": "Cena nie może przekraczać 1000 USD" }`

### EC-3: Alias podany wielkimi literami (np. `SONNET`)
- `PATCH /api/models/SONNET` — `resolveModelKey('SONNET')` zamienia na lowercase → `'sonnet'` → mapuje na `'sonnet-4.6'`
- Override stosowany poprawnie
- Response: HTTP 200

### EC-4: Restart serwera resetuje overrides
- Po restarcie Next.js dev serwera lub restarcie procesu Node.js
- `modelOverrides` (in-memory Map) jest pustą nową instancją
- `GET /api/models` zwraca wartości domyślne z `MODEL_COSTS`
- To jest oczekiwane zachowanie — nie error

---

## 🚫 Out of Scope tej Story

- Persystencja overrides do pliku lub bazy danych — pozostaje in-memory (reset przy restarcie)
- Edycja pól innych niż `cost_input_per_1m` i `cost_output_per_1m`
- Endpoint `DELETE /api/models/[alias]` (reset do defaults)
- Endpoint `GET /api/models/[alias]` (pobierz jeden model)
- Walidacja czy nowe ceny są "rozsądne" (np. porównanie z poprzednią wartością)

---

## ✔️ Definition of Done

- [ ] Plik `lib/model-overrides.ts` istnieje i eksportuje singleton `modelOverrides: Map<string, ModelCostOverride>`
- [ ] Plik `app/api/models/[alias]/route.ts` istnieje i eksportuje `PATCH`
- [ ] `PATCH` zwraca 401 gdy brak ADMIN JWT
- [ ] `PATCH` z nieznanym aliasem zwraca 404 z `"Model o aliasie '{alias}' nie istnieje"`
- [ ] `PATCH` z pustym body `{}` zwraca 400 z `"Podaj co najmniej jedno pole do aktualizacji"`
- [ ] `PATCH` z wartością ujemną zwraca 400 z `"Cena nie może być ujemna"`
- [ ] `PATCH` z wartością > 1000 zwraca 400 z `"Cena nie może przekraczać 1000 USD"`
- [ ] Zaktualizowana wartość widoczna w `GET /api/models` po udanym `PATCH`
- [ ] TypeScript — brak `any`, wszystkie typy zdefiniowane
- [ ] Kod przechodzi `next build` bez błędów
