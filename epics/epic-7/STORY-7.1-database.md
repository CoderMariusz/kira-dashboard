---
story_id: STORY-7.1
title: "Tabela eval_tasks + eval_run_task_results — migracja Bridge DB"
epic: EPIC-7
domain: database
difficulty: hard
recommended_model: sonnet
priority: must
depends_on: []
blocks: [STORY-7.2, STORY-7.3, STORY-7.4, STORY-7.5]
---

## 🎯 Cel
Stworzyć w Bridge DB dwie nowe tabele obsługujące golden tasks i per-task wyniki runów eval.
Bridge już ma: `eval_runs`, `eval_scores`. Rozszerzamy schema, nie zastępujemy.

## Kontekst
**Projekt Bridge:** `/Users/mariuszkrawczyk/codermariusz/kira`
Uruchom: `cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate`

## ✅ Acceptance Criteria

### AC-1: Tabela `eval_tasks`
```sql
CREATE TABLE eval_tasks (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  prompt      TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('API','Auth','CRUD','Pipeline','Reasoning','Home')),
  target_model TEXT NOT NULL CHECK (target_model IN ('haiku','kimi','sonnet','codex','glm')),
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
```

### AC-2: Tabela `eval_run_task_results`
```sql
CREATE TABLE eval_run_task_results (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  run_id      TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  task_id     TEXT NOT NULL REFERENCES eval_tasks(id) ON DELETE CASCADE,
  actual_output TEXT NOT NULL DEFAULT '',
  passed      INTEGER NOT NULL DEFAULT 0,
  diff_score  REAL NOT NULL DEFAULT 0.0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_eval_run_task_results_run_id ON eval_run_task_results(run_id);
CREATE INDEX idx_eval_run_task_results_task_id ON eval_run_task_results(task_id);
```

### AC-3: Migracja w Bridge
- Numer migracji: kolejny po istniejących (sprawdź: `ls bridge/db/migrations.py` lub plik migracji)
- Migracja idempotentna: `CREATE TABLE IF NOT EXISTS`
- Migracja wykonuje się przez istniejący mechanizm Bridge: `python -m bridge.cli` lub autorun przy starcie

### AC-4: Modele Pydantic
Stwórz lub zaktualizuj modele w `bridge/work_registry_models.py` lub nowym pliku `bridge/eval_models.py`:
```python
class EvalTask(BaseModel):
    id: str
    prompt: str
    expected_output: str
    category: Literal['API','Auth','CRUD','Pipeline','Reasoning','Home']
    target_model: Literal['haiku','kimi','sonnet','codex','glm']
    is_active: bool = True
    created_at: str
    updated_at: str

class EvalRunTaskResult(BaseModel):
    id: str
    run_id: str
    task_id: str
    actual_output: str = ''
    passed: bool = False
    diff_score: float = 0.0
    created_at: str
```

### AC-5: Repo `eval_tasks`
Stwórz `bridge/db/repositories/eval_task_repo.py`:
- `create(prompt, expected_output, category, target_model) -> EvalTask`
- `find_all(category: str | None = None, active_only: bool = True) -> list[EvalTask]`
- `find_by_id(task_id: str) -> EvalTask | None`
- `update(task_id, **fields) -> EvalTask`
- `delete(task_id: str) -> bool`

### AC-6: Repo `eval_run_task_results`
Stwórz `bridge/db/repositories/eval_run_result_repo.py`:
- `create_batch(results: list[dict]) -> list[EvalRunTaskResult]`
- `find_by_run_id(run_id: str) -> list[EvalRunTaskResult]`
- `find_by_run_ids(run_ids: list[str]) -> dict[str, list[EvalRunTaskResult]]`

### AC-7: Testy
- `tests/test_eval_task_repo.py` — CRUD + filter tests
- `python -m pytest tests/test_eval_task_repo.py -v` → PASS

## ⚠️ Uwagi
- Sprawdź istniejące `eval_runs` schema przed migracją — nie nadpisuj
- FK: `eval_run_task_results.run_id` → `eval_runs.id` — sprawdź nazwę kolumny id w eval_runs
- Jeśli eval_runs.id ma inną nazwę → dostosuj FK lub użyj `run_external_id TEXT` zamiast FK

## ✔️ DoD
- [ ] `CREATE TABLE IF NOT EXISTS` w migracji
- [ ] Oba modele Pydantic działają
- [ ] Oba repo — CRUD działa na lokalnym DB
- [ ] pytest PASS
- [ ] Commit na `feature/STORY-7.1` w repo kira
