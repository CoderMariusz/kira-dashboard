---
story_id: STORY-9.3
title: "GET /api/nightclaw/skills-diff — git diff na plikach SKILL.md"
epic: EPIC-9
domain: backend
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: none
blocks: [STORY-9.5]
tags: [api, nightclaw, git-diff, skills]
---

## 🎯 User Story
Admin widzi które SKILL.md zostały zmienione przez NightClaw i jaki był diff.

## Endpoint
`GET /api/nightclaw/skills-diff`
Auth: requireAuth

## Logika
Uruchom: `git diff HEAD~1 HEAD -- "**SKILL.md"` w katalogu `.openclaw/skills/`
Alternatywnie: `git log --diff-filter=M --name-only -1 -- "*/SKILL.md"` + `git diff HEAD~1 HEAD -- <plik>`

Ważne: praca w repo `/Users/mariuszkrawczyk/.openclaw/skills/` lub `/opt/homebrew/lib/node_modules/openclaw/skills/`
Użyj `child_process.execSync` z timeout 10s.

## Response
```typescript
{
  skills: Array<{
    name: string           // np. "kira-orchestrator"
    path: string           // np. "skills/kira-orchestrator/SKILL.md"
    diff: string           // raw diff string
    lines_added: number
    lines_removed: number
    modified_at: string    // ISO 8601 z git log
  }>
  total_modified: number
}
```

## AC
- Zwraca zmodyfikowane SKILL.md od ostatniego commita NightClaw
- Jeśli brak zmian → `skills: [], total_modified: 0`
- Git error / brak repo → graceful: zwraca `{ skills: [], total_modified: 0, error: "git unavailable" }`
- 401 bez sesji

## DoD
- [ ] Testy: mock child_process, happy path, brak zmian, git error
- [ ] Timeout 10s na git subprocess
- [ ] Nie crashuje gdy repo nie istnieje
