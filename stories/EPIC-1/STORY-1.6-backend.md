---
story_id: STORY-1.6
title: "Widgety nightclaw-card + patterns-summary + gateway-status"
epic: EPIC-1
module: widgets
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 4h
depends_on: STORY-0.2, STORY-0.11
blocks: none
tags: widget, bridge, dashboard, nightclaw, patterns, gateway
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć widgety `nightclaw-card`, `patterns-summary` i `gateway-status` na dashboardzie
**Żeby** szybko sprawdzić: co NightClaw zrobił w nocy (osobny widget), top patterns systemu i status połączenia z OpenClaw gateway

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `server.cjs` lub `widgets/nightclaw-card.js`, `widgets/patterns-summary.js`, `widgets/gateway-status.js`
- 3 osobne widgety, każdy z własnym `generateHtml()` + `generateJs()`
- Endpointy (przez Bridge proxy z STORY-0.2 lub health-check z STORY-0.11):
  - `nightclaw-card`: `GET /api/bridge/nightclaw/summary`
  - `patterns-summary`: `GET /api/bridge/patterns`
  - `gateway-status`: `GET /api/health-check` (sekcja openclaw)

### Powiązane pliki
- `server.cjs` — rejestracja 3 widgetów
- STORY-0.2 — proxy Bridge
- STORY-0.11 — health-check
- `archive/` — READ ONLY: wzorzec card widgetów

### Stan systemu przed tą story
- STORY-0.2 gotowe: proxy `/api/bridge/*` działa
- STORY-0.11 gotowe: `/api/health-check` działa

---

## ✅ Acceptance Criteria

### AC-1: Wszystkie 3 widgety w gallery
GIVEN: Mariusz zalogowany jako Admin
WHEN: Otwiera widget gallery
THEN: Widoczne 3 nowe widgety:
  - "NightClaw" (nightclaw-card)
  - "Patterns Summary" (patterns-summary)
  - "Gateway Status" (gateway-status)

### AC-2: nightclaw-card wyświetla ostatni digest
GIVEN: NightClaw uruchomił się ostatniej nocy
WHEN: Widget `nightclaw-card` załadowany
THEN: Wyświetla:
  - Data ostatniego runu (np. "2026-03-05 03:00")
  - Liczba patterns znalezionych (np. "3 patterns")
  - Pierwsze 2 bullet points z digest (truncate do 100 znaków każdy)
  - Link "View NightClaw →" → `/pages/nightclaw/`

### AC-3: patterns-summary wyświetla top 5 patterns
GIVEN: Bridge ma patterns w bazie
WHEN: Widget `patterns-summary` załadowany
THEN: Wyświetla ordered listę top 5 patterns według count:
  - Każdy wiersz: rank (#1, #2...) + krótka nazwa patternu (max 40 znaków) + count użycia
  - Pod listą: "N total patterns | M anti-patterns" footer
  - Link "View All Patterns →" → `/pages/patterns/`

### AC-4: gateway-status wyświetla połączenie OpenClaw
GIVEN: OpenClaw gateway jest online
WHEN: Widget `gateway-status` załadowany
THEN: Wyświetla:
  - Badge "CONNECTED" (zielony) lub "DISCONNECTED" (czerwony)
  - Wersja OpenClaw (jeśli dostępna z health-check)
  - Liczba aktywnych sesji (jeśli dostępna)
  - Latency do gateway w ms

### AC-5: nightclaw-card — brak runu w nocy
GIVEN: NightClaw nie uruchomił się ostatnich 12h
WHEN: Widget załadowany
THEN: Widget pokazuje "No NightClaw run last night" zamiast danych + ikona 😴

---

## ⚙️ Szczegóły Backend

### Widget 1: nightclaw-card
Endpoint: `GET /api/bridge/nightclaw/summary`
```typescript
interface NightclawSummary {
  last_run_at: string | null  // ISO 8601
  patterns_found: number
  key_lessons: string[]       // array bullet points, max 5
  digest_preview: string      // pierwsze 200 znaków digest
  available: boolean
}
```
Widget `generateHtml()`: Card layout — header "NightClaw 🌙" + data runu, body: patterns count + 2 key lessons, footer: link "View NightClaw →"
Widget `generateJs()`: Fetch raz przy załadowaniu (NightClaw nie zmienia się w ciągu dnia), refresh co 4h

### Widget 2: patterns-summary
Endpoint: `GET /api/bridge/patterns`
```typescript
interface PatternsResponse {
  top_patterns: Array<{
    name: string     // max 40 znaków
    count: number    // liczba użyć
    type: "pattern" | "anti-pattern"
  }>
  total_patterns: number
  total_anti_patterns: number
}
```
Widget `generateHtml()`: Ordered list 5 wierszy + footer z total counts + link "View All →"
Widget `generateJs()`: Fetch przy załadowaniu, refresh co 10 minut

### Widget 3: gateway-status
Endpoint: `GET /api/health-check` (sekcja `openclaw`)
```typescript
// Parsuj z health-check response:
interface GatewayInfo {
  status: "up" | "down"
  latency_ms: number | null
  version?: string      // jeśli health-check zwraca
  active_sessions?: number
}
```
Widget `generateHtml()`: Duży badge CONNECTED/DISCONNECTED + wersja + sesje + latency ms
Widget `generateJs()`: Fetch co 30s, smooth update (jak service-health)

---

## ⚠️ Edge Cases

### EC-1: Bridge offline (nightclaw-card + patterns-summary)
Scenariusz: Bridge proxy niedostępny
Oczekiwane zachowanie: Oba widgety pokazują "Bridge offline" overlay
Komunikat dla użytkownika: "Bridge offline"

### EC-2: Patterns baza pusta
Scenariusz: Brak patterns w Bridge (nowy system)
Oczekiwane zachowanie: patterns-summary pokazuje "No patterns recorded yet" + zerowe countery
Komunikat dla użytkownika: "No patterns recorded yet"

### EC-3: Pattern name > 40 znaków
Scenariusz: Nazwa patternu jest długa
Oczekiwane zachowanie: Truncate do 40 znaków + "..." suffix — NIE overflow layout

### EC-4: OpenClaw gateway disconnect w trakcie sesji
Scenariusz: gateway-status był CONNECTED, przy następnym refresh jest DISCONNECTED
Oczekiwane zachowanie: Badge zmienia kolor z CSS transition 0.3s, wyświetla "Reconnecting..." przez 3s, potem DISCONNECTED

---

## 🚫 Out of Scope tej Story
- Pełny widok NightClaw digest (to `/pages/nightclaw/` — EPIC-9)
- Pełna lista patterns (to `/pages/patterns/` — EPIC-8)
- Alert gdy gateway disconnected (to notification system)
- Edycja patterns (to EPIC-8)

---

## ✔️ Definition of Done
- [ ] 3 widgety rejestrują się w gallery (NightClaw, Patterns Summary, Gateway Status)
- [ ] nightclaw-card: data + patterns count + 2 bullet points + link
- [ ] nightclaw-card: "No NightClaw run last night" gdy brak runu w 12h
- [ ] patterns-summary: top 5 list z count + totals footer + link
- [ ] patterns-summary: "No patterns" gdy pusta baza
- [ ] gateway-status: CONNECTED/DISCONNECTED badge z latency
- [ ] gateway-status: auto-refresh co 30s
- [ ] Wszystkie 3: Bridge/health-check offline → graceful fallback
- [ ] Pattern names > 40 znaków truncated
- [ ] Kod przechodzi linter bez błędów
