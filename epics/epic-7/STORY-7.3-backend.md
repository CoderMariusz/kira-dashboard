---
story_id: STORY-7.3
title: "CRUD API /api/eval/tasks — zarządzanie golden tasks"
epic: EPIC-7
domain: backend
difficulty: medium
recommended_model: kimi
priority: must
depends_on: [STORY-7.1, STORY-7.2]
blocks: [STORY-7.5, STORY-7.6]
---

## 🎯 Cel
Zaimplementować CRUD API dla golden tasks. ADMIN może tworzyć/edytować/usuwać zadania testowe,
wszyscy zalogowani mogą je czytać.

## Kontekst
**Projekt:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`
Bridge CLI: `cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate && python -m bridge.cli`
Auth helpers: `import { requireAdmin, requireAuth } from '@/lib/auth/requireRole'` (STORY-7.2)
Bridge repo: `bridge/db/repositories/eval_task_repo.py` (STORY-7.1)

## ✅ Acceptance Criteria

### AC-1: `GET /api/eval/tasks`
Plik: `app/api/eval/tasks/route.ts`
- Auth: `requireAuth` (401 bez sesji)
- Query params: `?category=Pipeline` (opcjonalny filtr), `?active_only=true` (domyślnie true)
- Wywołuje Bridge CLI: `bridge.cli eval list-tasks [--category X] [--all]` lub bezpośrednio repo
- Response: `{ tasks: EvalTask[] }`
- 200 OK

### AC-2: `POST /api/eval/tasks`
- Auth: `requireAdmin` (401/403)
- Body: `{ prompt: string, expected_output: string, category: string, target_model: string }`
- Walidacja: wszystkie pola wymagane, category i target_model w dozwolonym enum
- Wywołuje Bridge: `bridge.cli eval create-task --prompt "..." --expected "..." --category API --model sonnet`
- Response: `{ task: EvalTask }`
- 201 Created | 400 validation error

### AC-3: `PATCH /api/eval/tasks/[id]`
Plik: `app/api/eval/tasks/[id]/route.ts`
- Auth: `requireAdmin`
- Body: partial update (dowolne pola z: prompt, expected_output, category, target_model, is_active)
- 404 jeśli task nie istnieje
- Response: `{ task: EvalTask }`

### AC-4: `DELETE /api/eval/tasks/[id]`
- Auth: `requireAdmin`
- Potwierdza istnienie przed usunięciem → 404 jeśli brak
- Response: `{ success: true }`

### AC-5: Bridge CLI komendy (lub bezpośredni dostęp przez Python subprocess)
Jeśli Bridge CLI nie ma komend eval tasks → wywołaj Bridge przez `exec` + Python skrypt:
```bash
cd /path/to/kira && source .venv/bin/activate && python -c "
from bridge.db.repositories.eval_task_repo import EvalTaskRepo
from bridge.db.connection import get_db
with get_db() as db:
    repo = EvalTaskRepo(db)
    print(repo.find_all())
"
```
Lub dodaj komendy do Bridge CLI — do wyboru agenta.

### AC-6: Testy integracyjne
`__tests__/api/eval/tasks.test.ts`:
- GET 401 bez sesji
- GET 200 z listą (mockowany Bridge)
- GET 200 z filtrem category
- POST 403 dla USER
- POST 201 dla ADMIN z valid body
- POST 400 brakujące pola
- PATCH 404 nieistniejący task
- PATCH 200 successful update
- DELETE 403 dla USER
- DELETE 200 successful delete

`npm test __tests__/api/eval/` → wszystkie PASS

## ⚠️ Uwagi
- Bridge CLI pattern: `execSync` lub `spawn` jak w istniejących routes
- Escape inputs przed przekazaniem do CLI (nie injection)
- is_active domyślnie true przy tworzeniu

## ✔️ DoD
- [ ] 4 endpointy działają (GET, POST, PATCH, DELETE)
- [ ] RBAC poprawnie egzekwowany
- [ ] Testy PASS
- [ ] `npx tsc --noEmit` — 0 błędów w nowych plikach
- [ ] Commit na `feature/STORY-7.3`
