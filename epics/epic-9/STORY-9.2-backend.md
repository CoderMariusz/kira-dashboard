---
story_id: STORY-9.2
title: "GET /api/nightclaw/history — 90-dniowa historia runów"
epic: EPIC-9
domain: backend
difficulty: simple
recommended_model: kimi-k2.5
depends_on: none
blocks: [STORY-9.5]
tags: [api, nightclaw, history, calendar]
---

## 🎯 User Story
Calendar view potrzebuje historii: które dni mają digest (OK/ERROR/MISSING).

## Endpoint
`GET /api/nightclaw/history`
Auth: requireAuth

## Logika
Skanuj katalog `.kira/nightclaw/digest/` (ostatnie 90 dni).
Dla każdej daty YYYY-MM-DD:
- Brak pliku → `status: "missing"`
- Plik istnieje, NIE zawiera `## 🔍 Otwarte problemy` z treścią → `status: "ok"`
- Plik istnieje i zawiera otwarte problemy (niepusta lista po nagłówku) → `status: "error"`

## Response
```typescript
{
  entries: Array<{ date: string; status: "ok" | "error" | "missing" }>
  total_runs: number
  total_errors: number
}
```

## AC
- Zwraca 90 wpisów (90 ostatnich dni)
- Poprawne statusy ok/error/missing
- Pusty dir → same "missing"
- 401 bez sesji

## DoD
- [ ] Testy: skan katalogu, status detection, 401
- [ ] Posortowane chronologicznie malejąco (najnowszy pierwszy)
