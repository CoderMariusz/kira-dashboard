---
story_id: STORY-5.1
title: "Models API — pobieranie listy modeli z Bridge + token stats"
epic: EPIC-5
module: models
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
ux_reference: none
api_reference: none
priority: must
estimated_effort: 3h
depends_on: [STORY-0.2]
blocks: [STORY-5.2, STORY-5.4]
tags: [bridge-proxy, stats, models, api]
---

## 🎯 User Story

**Jako** Mariusz (admin)
**Chcę** mieć API endpointy zwracające listę modeli AI z ich statystykami użycia
**Żeby** frontend Models page mógł wyświetlić aktualne dane o modelach bez bezpośredniego dostępu do Bridge

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route handler: `app/api/models/route.ts` (GET — lista + stats)
Plik config: `models_config.json` w root projektu (plik lokalny, nie bridge.yml)

### Powiązane pliki
- `app/api/bridge/[...path]/route.ts` — istniejący proxy do Bridge (STORY-0.2)
- `models_config.json` — lokalny plik z konfiguracją cen tokenów per model
- Bridge endpoint: `GET /api/bridge/status/models` — lista modeli
- Bridge endpoint: `GET /api/bridge/status/runs?model=<name>&days=<n>` — runy per model

### Stan systemu przed tą story
- STORY-0.2 (Bridge proxy) musi być gotowy — `/api/bridge/*` działa
- Next.js API routes działają
- Auth middleware (STORY-3.3) nie jest wymagany dla backendu tej story — strona i tak będzie chroniona przez middleware EPIC-3 na poziomie layout

---

## ✅ Acceptance Criteria

### AC-1: GET /api/models zwraca listę modeli z podstawowymi danymi
GIVEN: użytkownik z rolą `admin` wywołuje `GET /api/models`
WHEN: Bridge jest dostępny i zwraca listę modeli
THEN: endpoint zwraca 200 z tablicą obiektów, każdy zawiera: `name`, `alias`, `provider`, `status` (active/inactive), `cost_per_1m_input_tokens`, `cost_per_1m_output_tokens`
AND: modele obejmują co najmniej: codex-5.3, kimi-k2.5, glm-5, haiku-4.5, sonnet-4.6, opus-4.6

### AC-2: GET /api/models zwraca stats per model
GIVEN: użytkownik wywołuje `GET /api/models?days=7` (lub `?days=30`)
WHEN: Bridge zwraca dane runów dla każdego modelu
THEN: każdy model w odpowiedzi zawiera: `total_runs`, `success_rate` (liczba 0-1 z dokładnością 2 miejsc po przecinku), `avg_duration_seconds`, `total_cost_usd`
AND: brakujące dane (model bez runów) zwracają `total_runs: 0`, `success_rate: null`, `avg_duration_seconds: null`, `total_cost_usd: 0`

### AC-3: Parametr days domyślnie 7, akceptuje 7 lub 30
GIVEN: użytkownik wywołuje `GET /api/models` bez parametru `days`
WHEN: endpoint przetwarza request
THEN: endpoint używa `days=7` jako wartość domyślną i zwraca dane z ostatnich 7 dni
AND: wywołanie z `?days=30` zwraca dane z ostatnich 30 dni
AND: wywołanie z `?days=90` zwraca 400: `"Parametr days musi wynosić 7 lub 30"`

### AC-4: models_config.json jest odczytywany i mergowany z Bridge data
GIVEN: plik `models_config.json` istnieje z konfiguracją cen tokenów
WHEN: endpoint pobiera listę modeli
THEN: ceny z `models_config.json` są mergowane do odpowiedzi (`cost_per_1m_input_tokens`, `cost_per_1m_output_tokens`)
AND: jeśli model nie ma wpisu w `models_config.json`, zwraca `cost_per_1m_input_tokens: null`

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**GET /api/models**
```
Method: GET
Path: /api/models
Auth: Bearer token (weryfikacja roli admin przez middleware EPIC-3 — tu zakładamy że middleware już blokuje)
Role: admin
```

### Request Schema

```typescript
// Query params
interface QueryParams {
  days?: 7 | 30  // default: 7
}
```

### Response Schema

```typescript
// 200 OK
interface ModelsResponse {
  data: ModelWithStats[]
  meta: {
    days: number        // 7 lub 30
    fetched_at: string  // ISO 8601
  }
}

interface ModelWithStats {
  name: string                        // "codex-5.3"
  alias: string                       // "codex"
  provider: string                    // "openai" | "anthropic" | "moonshot" | "zhipu"
  status: "active" | "inactive"
  cost_per_1m_input_tokens: number | null   // z models_config.json
  cost_per_1m_output_tokens: number | null  // z models_config.json
  stats: {
    total_runs: number
    success_rate: number | null        // 0.0 – 1.0
    avg_duration_seconds: number | null
    total_cost_usd: number
  }
}

// Kody błędów
// 400 → nieprawidłowy parametr days
// 401 → brak tokena
// 403 → rola nie jest admin
// 502 → Bridge niedostępny (timeout lub błąd połączenia)
// 500 → nieoczekiwany błąd serwera
```

### Logika biznesowa (krok po kroku)

```
1. Parsuj query params — `days` → walidacja (7 lub 30); błąd? → 400
2. Odczytaj `models_config.json` z fs — jeśli nie istnieje → utwórz pusty {}; błąd parsowania → log + użyj {}
3. Wywołaj Bridge: GET /api/bridge/status/models → lista modeli; błąd → 502
4. Dla każdego modelu wywołaj: GET /api/bridge/status/runs?model=<name>&days=<days>
   → zbierz: total_runs, successes, avg_duration, total_tokens (do kalkulacji kosztu)
5. Oblicz success_rate = successes / total_runs (zaokrąglij do 2 miejsc)
6. Oblicz total_cost_usd = (input_tokens/1M * cost_per_1m_input) + (output_tokens/1M * cost_per_1m_output)
   → jeśli brak ceny w config → total_cost_usd = 0
7. Merguj dane Bridge + stats + config → array ModelWithStats
8. Zwróć 200 z { data, meta }
```

### Struktura models_config.json

```json
{
  "codex-5.3": {
    "cost_per_1m_input_tokens": 3.00,
    "cost_per_1m_output_tokens": 15.00,
    "provider": "openai",
    "alias": "codex"
  },
  "kimi-k2.5": {
    "cost_per_1m_input_tokens": 0.15,
    "cost_per_1m_output_tokens": 0.60,
    "provider": "moonshot",
    "alias": "kimi"
  },
  "glm-5": {
    "cost_per_1m_input_tokens": 0.10,
    "cost_per_1m_output_tokens": 0.10,
    "provider": "zhipu",
    "alias": "glm"
  },
  "haiku-4.5": {
    "cost_per_1m_input_tokens": 0.25,
    "cost_per_1m_output_tokens": 1.25,
    "provider": "anthropic",
    "alias": "haiku"
  },
  "sonnet-4.6": {
    "cost_per_1m_input_tokens": 3.00,
    "cost_per_1m_output_tokens": 15.00,
    "provider": "anthropic",
    "alias": "sonnet"
  },
  "opus-4.6": {
    "cost_per_1m_input_tokens": 15.00,
    "cost_per_1m_output_tokens": 75.00,
    "provider": "anthropic",
    "alias": "opus"
  }
}
```

---

## ⚠️ Edge Cases

### EC-1: Bridge niedostępny
Scenariusz: wywołanie do `/api/bridge/status/models` zwraca timeout lub connection refused
Oczekiwane zachowanie: endpoint zwraca 502 z `{ error: "Bridge niedostępny", code: "BRIDGE_UNAVAILABLE" }`
Komunikat dla użytkownika: "Bridge niedostępny — spróbuj ponownie za chwilę"

### EC-2: Model istnieje w Bridge ale nie ma żadnych runów
Scenariusz: nowy model dodany do Bridge, `total_runs` = 0
Oczekiwane zachowanie: model jest obecny w odpowiedzi z `stats: { total_runs: 0, success_rate: null, avg_duration_seconds: null, total_cost_usd: 0 }`
Komunikat dla użytkownika: (frontend obsługuje — brak runu = "No data")

### EC-3: models_config.json zawiera niepoprawny JSON
Scenariusz: plik jest uszkodzony lub pusty
Oczekiwane zachowanie: endpoint loguje błąd do konsoli, używa pustego config `{}`, zwraca modele bez danych kosztowych (`cost_per_1m_input_tokens: null`)
Komunikat dla użytkownika: (brak — degradacja graceful, frontend pokazuje "—" dla kosztu)

---

## 🚫 Out of Scope tej Story
- PATCH /api/models/config/:name — edycja konfiguracji kosztów (STORY-5.4)
- POST /api/bridge/models/:name/toggle-monitoring — toggle monitoringu (STORY-5.4)
- Usage history per day dla chartów — dane agregowane są wystarczające

---

## ✔️ Definition of Done
- [ ] `GET /api/models` zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja parametru `days` odrzuca wartości inne niż 7/30 z czytelnym komunikatem
- [ ] Endpoint nie crashuje gdy Bridge jest niedostępny — zwraca 502
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z rolą inną niż admin zwraca 403
- [ ] `models_config.json` jest tworzony automatycznie z domyślnymi wartościami jeśli nie istnieje
- [ ] Kod przechodzi linter bez błędów (ESLint + TypeScript strict)
- [ ] Story review przez PO
