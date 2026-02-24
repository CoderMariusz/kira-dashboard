---
story_id: STORY-6.1
title: "POST /api/pipeline/prd-questions — Claude Haiku generuje pytania funkcjonalne z PRD"
epic: EPIC-6
module: pipeline
domain: backend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 4h
depends_on: none
blocks: [STORY-6.5, STORY-6.6]
tags: [api, anthropic, haiku, prd, ai, next.js, typescript, auth]
---

## 🎯 User Story

**Jako** aplikacja frontendowa kira-dashboard
**Chcę** endpoint `POST /api/pipeline/prd-questions` który na podstawie tekstu PRD generuje max 5 pytań funkcjonalnych przez Claude Haiku
**Żeby** wizard "Nowy projekt" mógł zadać użytkownikowi tylko niezbędne pytania o zachowanie produktu (bez pytań o stack/technologię)

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
app/api/pipeline/prd-questions/route.ts  → eksportuj POST
```

Stack:
- Next.js 16 App Router (route handler), `export const runtime = 'nodejs'`
- Anthropic SDK (`@anthropic-ai/sdk`) — już zainstalowany w projekcie (używany przez inne trasy)
- `requireAdmin()` z `lib/utils/require-admin.ts` — auth check
- TypeScript strict mode

Env var: `ANTHROPIC_API_KEY` — musi być ustawiony w `.env.local` i na Vercel

### Powiązane pliki
- `lib/utils/require-admin.ts` — wzorzec auth check
- `app/api/models/route.ts` — wzorzec route handlera do naśladowania
- `types/pipeline-prd.ts` — typy tworzone w STORY-6.5 (tutaj definiuj inline lub importuj jeśli już istnieją)

### Stan systemu przed tą story
- Auth działa (EPIC-3)
- `requireAdmin()` utility istnieje
- `ANTHROPIC_API_KEY` skonfigurowany w envach

---

## ✅ Acceptance Criteria

### AC-1: Walidacja długości PRD
GIVEN: request body z `prd_text` mającym mniej niż 50 znaków
WHEN: `POST /api/pipeline/prd-questions` jest wywołany
THEN: endpoint zwraca `400 Bad Request` z body `{ "error": "PRD musi mieć minimum 50 znaków" }`

### AC-2: Walidacja maksymalnej długości
GIVEN: request body z `prd_text` mającym więcej niż 20 000 znaków
WHEN: `POST /api/pipeline/prd-questions` jest wywołany
THEN: endpoint zwraca `400 Bad Request` z body `{ "error": "PRD nie może przekraczać 20 000 znaków" }`

### AC-3: Generowanie pytań — happy path
GIVEN: zalogowany admin z ważnym JWT i `prd_text` o długości 200+ znaków opisujący funkcjonalność aplikacji
WHEN: `POST /api/pipeline/prd-questions` jest wywołany
THEN: endpoint wywołuje Anthropic API (model `claude-haiku-4-5`) ze system promptem wymuszającym pytania funkcjonalne (nie o technologię)
AND: zwraca `200 OK` z `{ questions: [...] }` gdzie `questions` ma 1–5 elementów
AND: każdy element ma pola: `id` (string "q1"–"q5"), `text` (string po polsku), `type` ("text" | "choice"), `required` (boolean)
AND: elementy `type: 'choice'` mają pole `options: string[]` z min 2 opcjami

### AC-4: Auth — brak tokena
GIVEN: request bez nagłówka `Authorization`
WHEN: `POST /api/pipeline/prd-questions` jest wywołany
THEN: endpoint zwraca `401 Unauthorized`

### AC-5: Niedostępność Anthropic API
GIVEN: Anthropic API zwraca błąd (timeout, 5xx, rate limit)
WHEN: `POST /api/pipeline/prd-questions` jest wywołany z prawidłowym PRD
THEN: endpoint zwraca `503 Service Unavailable` z body `{ "error": "Serwis AI tymczasowo niedostępny" }`
AND: błąd jest zalogowany do `console.error` z detalami

---

## ⚙️ Szczegóły Backend

### Endpoint
```
METHOD: POST
Path:   /api/pipeline/prd-questions
Auth:   Supabase JWT (requireAdmin)
Role:   ADMIN
```

### Request Schema
```typescript
interface RequestBody {
  prd_text: string  // min 50, max 20 000 znaków
}
```

### Response Schema
```typescript
// 200 OK
interface SuccessResponse {
  questions: Array<{
    id: string           // "q1", "q2", ..., "q5"
    text: string         // pytanie po polsku
    type: 'text' | 'choice'
    options?: string[]   // tylko dla type='choice', min 2 opcje
    required: boolean
  }>
}

// Kody błędów
// 400 → prd_text za krótki lub za długi
// 401 → brak lub wygasły JWT
// 422 → AI zwrócił niepoprawny JSON (nie można sparsować)
// 503 → Anthropic API niedostępne / timeout
// 500 → nieoczekiwany błąd
```

### System prompt dla Claude Haiku
```
Jesteś asystentem Product Managera. Na podstawie dostarczonego PRD (Product Requirements Document) zadaj dokładnie od 3 do 5 KRÓTKICH pytań wyjaśniających.

ZASADY (rygorystycznie przestrzegaj):
1. Pytaj WYŁĄCZNIE o funkcjonalność i zachowanie produktu
2. NIE pytaj nigdy o: technologię, framework, bazę danych, cloud, deployment, stack, język programowania, API external
3. Pytaj o: kto będzie używał produktu, jakie są kluczowe przepływy użytkownika, jakie są integracje zewnętrzne (biznesowe, nie techniczne), jaki jest zakres MVP vs. przyszłe wersje, jakie są krytyczne przypadki użycia

Zwróć WYŁĄCZNIE poprawny JSON w formacie:
{
  "questions": [
    {
      "id": "q1",
      "text": "pytanie po polsku",
      "type": "text",
      "required": true
    },
    {
      "id": "q2",
      "text": "pytanie po polsku z opcjami",
      "type": "choice",
      "options": ["opcja 1", "opcja 2", "opcja 3"],
      "required": true
    }
  ]
}

Nie dodawaj żadnego tekstu poza JSON.
```

### Logika biznesowa (krok po kroku)
```
1. requireAdmin() → 401 jeśli brak auth
2. Parsuj JSON body → wyciągnij prd_text
3. Waliduj długość: < 50 → 400; > 20 000 → 400
4. Wywołaj Anthropic API:
   - model: "claude-haiku-4-5" (fallback: "claude-3-haiku-20240307")
   - max_tokens: 1000
   - system: system prompt powyżej
   - user: "PRD do analizy:\n\n{prd_text}"
5. Wyciągnij content[0].text z odpowiedzi
6. JSON.parse() wyodrębnionego tekstu
   → SyntaxError? zwróć 422 z "AI nie wygenerowało poprawnej odpowiedzi"
7. Waliduj że questions to array z 1-5 elementami
8. Dla każdego pytania waliduj: id, text, type, required są obecne
9. Zwróć 200 z { questions }
```

---

## ⚠️ Edge Cases

### EC-1: AI zwraca JSON z markdown code block
Scenariusz: Claude opakowuje JSON w ```json ... ``` blok
Oczekiwane zachowanie: wyodrębnij JSON między ``` a ``` przed parsowaniem; użyj regex `/```(?:json)?\s*([\s\S]*?)```/`

### EC-2: AI zwraca więcej niż 5 pytań
Scenariusz: Model ignoruje instrukcje i generuje 8 pytań
Oczekiwane zachowanie: przytnij tablicę do pierwszych 5 elementów przed zwróceniem

### EC-3: Puste `prd_text` po trimie
Scenariusz: `prd_text = "   "` (same spacje)
Oczekiwane zachowanie: `prd_text.trim().length < 50` → 400 z komunikatem "PRD musi mieć minimum 50 znaków"

### EC-4: Anthropic API timeout (>30s)
Scenariusz: Sieć jest powolna, API nie odpowiada w czasie
Oczekiwane zachowanie: ustaw `timeout: 30_000` w Anthropic client; catch błędu → 503

---

## 🚫 Out of Scope tej Story
- Przechowywanie pytań w bazie danych — to jednorazowe wywołanie, state żyje w React
- Cachowanie odpowiedzi AI per PRD
- Wielojęzyczność (tylko polski)
- Limit rate per user — dotyczy EPIC-7

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `npx tsc --noEmit` bez błędów
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem po polsku
- [ ] Endpoint nie crashuje na pustej bazie
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] System prompt wymusza pytania wyłącznie funkcjonalne (zweryfikuj ręcznie z przykładowym PRD)
- [ ] Odpowiedź Anthropic API z markdown code block jest prawidłowo obsłużona (EC-1)
- [ ] `console.error` loguje pełen błąd gdy Anthropic API jest niedostępne
