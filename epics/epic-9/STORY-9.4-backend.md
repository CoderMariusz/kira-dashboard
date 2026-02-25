---
story_id: STORY-9.4
title: "GET /api/nightclaw/research — lista i treść plików solutions/"
epic: EPIC-9
domain: backend
difficulty: simple
recommended_model: kimi-k2.5
depends_on: none
blocks: [STORY-9.5]
tags: [api, nightclaw, research, solutions]
---

## 🎯 User Story
Admin widzi pliki badań NightClaw z katalogu solutions/ bez otwierania terminala.

## Endpoint
`GET /api/nightclaw/research`
Auth: requireAuth

## Pliki źródłowe
`/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/solutions/`
Pomiń pliki: `_pending-apply.md` (wewnętrzny)

## Response
```typescript
{
  files: Array<{
    filename: string       // np. "cost-optimization-research.md"
    title: string          // pierwsza linia # z pliku, lub filename bez .md
    preview: string        // pierwsze 3 linie bez # nagłówka, max 200 znaków
    content: string        // pełna treść pliku
    modified_at: string    // ISO 8601 z fs.stat
  }>
}
```

## AC
- Zwraca wszystkie .md pliki z solutions/ (poza `_pending-apply.md`)
- Posortowane: najnowszy (modified_at) pierwszy
- Pusty katalog → `{ files: [] }`
- Brak katalogu → `{ files: [] }` (nie 500)
- 401 bez sesji

## DoD
- [ ] Testy: lista plików, brak katalogu, pusty katalog, 401
- [ ] Preview max 200 znaków
- [ ] `_pending-apply.md` pominięty
