---
story_id: STORY-5.4
title: "Model routing config API — CRUD dla model→task assignments"
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
blocks: []
tags: [models, routing, config, crud, api, monitoring]
---

## 🎯 User Story

**Jako** Mariusz (admin)
**Chcę** mieć API do odczytu i edycji konfiguracji routingu modeli oraz przełączania monitoringu
**Żeby** móc z poziomu KiraBoard zmieniać który model obsługuje easy/medium/hard/review stories bez edycji plików konfiguracyjnych

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route handlers:
- `app/api/models/routing-config/route.ts` — GET (odczyt) + PUT (aktualizacja całej konfiguracji)
- `app/api/models/config/[name]/route.ts` — PATCH (edycja kosztu tokenów per model)
- `app/api/bridge/models/[name]/toggle-monitoring/route.ts` — POST (toggle monitoringu przez Bridge)

Plik lokalny: `models_routing_config.json` w root projektu

### Powiązane pliki
- `models_config.json` — koszty tokenów (uzupełniany przez STORY-5.1)
- `models_routing_config.json` — NOWY plik: routing stories do modeli
- `app/api/bridge/[...path]/route.ts` — proxy do Bridge (dla toggle-monitoring)

### Stan systemu przed tą story
- STORY-0.2 gotowy: Bridge proxy działa
- `models_config.json` istnieje (z STORY-5.1 lub wcześniej)
- Next.js API routes działają

---

## ✅ Acceptance Criteria

### AC-1: GET /api/models/routing-config zwraca aktualną konfigurację routingu
GIVEN: plik `models_routing_config.json` istnieje z konfiguracją
WHEN: wywołanie `GET /api/models/routing-config`
THEN: endpoint zwraca 200 z obiektem zawierającym mapę: `easy`, `medium`, `hard`, `review` → nazwa modelu
AND: jeśli plik nie istnieje → zwraca domyślną konfigurację (easy: kimi-k2.5, medium: sonnet-4.6, hard: codex-5.3, review: sonnet-4.6)

### AC-2: PUT /api/models/routing-config aktualizuje konfigurację routingu
GIVEN: admin wywołuje `PUT /api/models/routing-config` z body `{ "easy": "haiku-4.5", "medium": "sonnet-4.6", "hard": "codex-5.3", "review": "sonnet-4.6" }`
WHEN: wszystkie wartości są prawidłowymi nazwami modeli
THEN: endpoint zapisuje konfigurację do `models_routing_config.json` i zwraca 200 z zaktualizowaną konfiguracją
AND: kolejne `GET /api/models/routing-config` zwraca nową konfigurację

### AC-3: PATCH /api/models/config/:name aktualizuje koszt tokenów
GIVEN: admin wywołuje `PATCH /api/models/config/sonnet-4.6` z body `{ "cost_per_1m_input_tokens": 3.50, "cost_per_1m_output_tokens": 16.00 }`
WHEN: `name` istnieje w aktualnej konfiguracji lub na liście znanych modeli
THEN: endpoint aktualizuje `models_config.json` dla podanego modelu i zwraca 200 z zaktualizowanym obiektem
AND: tylko pola `cost_per_1m_input_tokens` i `cost_per_1m_output_tokens` są aktualizowalne przez ten endpoint (inne pola ignorowane)

### AC-4: POST toggle-monitoring przekazuje request do Bridge
GIVEN: admin wywołuje `POST /api/bridge/models/sonnet-4.6/toggle-monitoring`
WHEN: Bridge jest dostępny
THEN: endpoint proxy'uje request do Bridge i zwraca odpowiedź Bridge (200 + `{ model: "sonnet-4.6", monitoring: false }`)
AND: odpowiedź zawiera nowy stan `monitoring` (true/false)

---

## ⚙️ Szczegóły Backend

### Endpoint 1 — GET /api/models/routing-config

```
Method: GET
Path: /api/models/routing-config
Auth: Bearer token / admin role
Role: admin
```

```typescript
// Response 200
interface RoutingConfigResponse {
  data: {
    easy:   string  // np. "kimi-k2.5"
    medium: string  // np. "sonnet-4.6"
    hard:   string  // np. "codex-5.3"
    review: string  // np. "sonnet-4.6"
  }
  source: "file" | "default"  // "default" gdy plik nie istnieje
}
```

### Endpoint 2 — PUT /api/models/routing-config

```
Method: PUT
Path: /api/models/routing-config
Auth: Bearer token / admin role
Role: admin
```

```typescript
// Request body
interface RoutingConfigBody {
  easy:   string  // walidacja: musi być jedną z: kimi-k2.5, glm-5, haiku-4.5, sonnet-4.6, codex-5.3, opus-4.6
  medium: string  // j.w.
  hard:   string  // j.w.
  review: string  // j.w.
}

// Response 200 — zwraca to samo co GET po zapisie
// Response 400 — nieprawidłowa nazwa modelu: "Nieznany model: {name}. Dozwolone: ..."
```

### Endpoint 3 — PATCH /api/models/config/:name

```
Method: PATCH
Path: /api/models/config/:name
Auth: Bearer token / admin role
Role: admin
```

```typescript
// Request body (oba opcjonalne, min 1 wymagany)
interface ModelConfigPatchBody {
  cost_per_1m_input_tokens?:  number  // walidacja: > 0, max 1000
  cost_per_1m_output_tokens?: number  // walidacja: > 0, max 1000
}

// Response 200
interface ModelConfigPatchResponse {
  data: {
    name: string
    cost_per_1m_input_tokens: number
    cost_per_1m_output_tokens: number
    updated_at: string  // ISO 8601
  }
}
// Response 400 → walidacja: wartość ≤ 0 lub > 1000
// Response 404 → model o podanej nazwie nieznany
```

### Endpoint 4 — POST /api/bridge/models/:name/toggle-monitoring

```
Method: POST
Path: /api/bridge/models/:name/toggle-monitoring
Auth: Bearer token / admin role
Role: admin
```

```typescript
// Response — pass-through z Bridge
interface ToggleMonitoringResponse {
  data: {
    model: string
    monitoring: boolean  // nowy stan po toggle
  }
}
// Response 404 → model nieznany (od Bridge)
// Response 502 → Bridge niedostępny
```

### Logika biznesowa — PUT /api/models/routing-config

```
1. Parsuj body → walidacja że zawiera pola: easy, medium, hard, review
2. Dla każdej wartości → sprawdź czy jest w liście dozwolonych modeli → błąd? 400
3. Odczytaj aktualny models_routing_config.json (lub {} jeśli brak)
4. Merge: zachowaj istniejące pola, nadpisz przesłane
5. Zapisz do models_routing_config.json
6. Zwróć 200 z zaktualizowaną konfiguracją
```

### Logika biznesowa — PATCH /api/models/config/:name

```
1. Parsuj :name z URL → sprawdź czy to znany model (lista hardcoded lub z models_config.json)
   → nieznany? 404
2. Parsuj body → walidacja wartości (> 0 i ≤ 1000)
   → nieprawidłowe? 400 z polem które nie przeszło
3. Odczytaj models_config.json
4. Zaktualizuj tylko przesłane pola dla modelu :name
5. Dodaj `updated_at` timestamp
6. Zapisz models_config.json
7. Zwróć 200 z zaktualizowanym obiektem modelu
```

### Domyślna konfiguracja routing (fallback gdy plik nie istnieje)

```json
{
  "easy":   "kimi-k2.5",
  "medium": "sonnet-4.6",
  "hard":   "codex-5.3",
  "review": "sonnet-4.6"
}
```

---

## ⚠️ Edge Cases

### EC-1: Dwa równoczesne requesty PATCH na ten sam model
Scenariusz: race condition — dwa requesty modyfikują `models_config.json` jednocześnie
Oczekiwane zachowanie: pliki JSON zapisywane atomowo (write to tmp + rename) — żaden zapis nie jest częściowy
Komunikat dla użytkownika: oba requesty kończą się sukcesem (ostatni wygrywa — acceptable dla admin-only endpoint)

### EC-2: Próba przypisania nieznanego modelu do routingu
Scenariusz: `PUT /api/models/routing-config` z body `{ "easy": "gpt-99", ... }`
Oczekiwane zachowanie: endpoint zwraca 400: `"Nieznany model: gpt-99. Dozwolone modele: kimi-k2.5, glm-5, haiku-4.5, sonnet-4.6, codex-5.3, opus-4.6"`
Komunikat dla użytkownika: "Nieznany model: gpt-99. Dozwolone modele: ..."

### EC-3: Bridge nie obsługuje toggle-monitoring dla danego modelu
Scenariusz: Bridge zwraca 404 dla `POST /bridge/models/unknown-model/toggle-monitoring`
Oczekiwane zachowanie: endpoint przekazuje 404 z Bridge z komunikatem Bridge lub własnym: `"Model nieznany: {name}"`
Komunikat dla użytkownika: "Model nieznany w Bridge — sprawdź konfigurację bridge.yml"

---

## 🚫 Out of Scope tej Story
- Walidacja czy zmiana routingu jest "bezpieczna" (np. ostrzeżenie gdy model disabled) — UX walidacja jest w STORY-5.3
- Historia zmian konfiguracji (audit log) — future feature
- Bulk update wielu modeli na raz — nie potrzebne w MVP

---

## ✔️ Definition of Done
- [ ] `GET /api/models/routing-config` zwraca domyślny config gdy plik nie istnieje
- [ ] `PUT /api/models/routing-config` zapisuje config i weryfikuje nazwy modeli (400 dla nieznanych)
- [ ] `PATCH /api/models/config/:name` aktualizuje tylko pola kosztowe, 404 dla nieznanego modelu
- [ ] `POST toggle-monitoring` proxy'uje do Bridge i zwraca nowy stan monitoring
- [ ] Wszystkie endpointy zwracają 401 bez tokena, 403 dla roli nie-admin
- [ ] Zapis pliku JSON jest atomowy (tmp file + rename) lub blokowany przez mutex
- [ ] Kod przechodzi linter bez błędów (ESLint + TypeScript strict)
- [ ] Story review przez PO
