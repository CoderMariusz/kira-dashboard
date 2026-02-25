---
story_id: STORY-9.1
title: "GET /api/nightclaw/digest — markdown + model-stats parser"
epic: EPIC-9
domain: backend
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: none
blocks: [STORY-9.5]
tags: [api, nightclaw, digest, markdown, model-stats]
---

## 🎯 User Story
Admin widzi pełny digest NightClaw z API — markdown + statystyki modeli.

## Spec pełna
`/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/EPIC-9-nightclaw.md` → STORY-9.1

## Endpoint
`GET /api/nightclaw/digest?date=YYYY-MM-DD`
Auth: requireAuth

## Pliki źródłowe
- `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/digest/YYYY-MM-DD.md`
- `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/model-stats.json`

## Response
```typescript
{
  date: string
  markdown: string              // surowy markdown
  summary: {
    new_patterns: number
    lessons_extracted: number
    anti_patterns_flagged: number
    open_issues: number         // count sekcji "❌" w markdown
    generated_at: string
  }
  model_stats: ModelStats       // zawartość model-stats.json
}
```

## AC
- 200 z markdown + summary + model_stats dla istniejącego dnia
- 404 gdy plik nie istnieje dla danej daty
- Brak daty → default: dzisiaj
- `open_issues` = liczba linii z "❌" lub sekcja "## 🔍 Otwarte problemy"
- 401 bez sesji

## DoD
- [ ] Testy: happy path, brak pliku (404), brak daty, 401
- [ ] Parser summary działa (open_issues, new_patterns)
- [ ] model_stats.json zwracany as-is
