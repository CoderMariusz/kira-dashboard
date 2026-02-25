# STORY-7.1 Review Feedback (NEEDS_REFACTOR)

## Decision
NEEDS_REFACTOR

## Findings

### 1) Missing core DB scope from story (BLOCKER)
Story 7.1 requires DB/infrastructure deliverables for Eval:
- `eval_tasks` table (prompt, expected_output, category, target_model, is_active)
- `eval_run_task_results` table (run ↔ task ↔ actual_output, passed, diff_score)
- SQL migration for Bridge DB

In `feature/STORY-7.1`, I could not find any SQL migration or schema changes introducing these tables.
The branch content is only Jest/Testing Library/MSW setup.

**Why this blocks approval:** main functional scope of the story (database schema + migration) is not implemented.

### 2) Build currently fails (BLOCKER)
`npm run build` fails with:

`Both middleware file "./middleware.ts" and proxy file "./proxy.ts" are detected. Please use "./proxy.ts" only.`

This must be resolved so the branch is build-green.

### 3) Test command mismatch with Jest 30 CLI (MAJOR)
The requested command using `--testPathPattern` fails because Jest 30 expects `--testPathPatterns`.

Observed error:
`Option "testPathPattern" was replaced by "--testPathPatterns".`

`--testPathPatterns` works, but currently there are no eval/7.1 tests found.

### 4) Jest coverage config appears self-cancelling (MAJOR)
In `jest.config.ts`, `collectCoverageFrom` contains includes followed by negations that exclude the same globs:
- `app/**/*.{ts,tsx}` then `!app/**/*`
- `components/**/*.{ts,tsx}` then `!components/**/*`
- `hooks/**/*.{ts,tsx}` then `!hooks/**/*`
- `services/**/*.{ts,tsx}` then `!services/**/*`

This effectively disables coverage collection for these directories.
If intentional, document it clearly; otherwise fix the config.

## Required fixes before re-review
1. Add Bridge DB migration(s) creating:
   - `eval_tasks`
   - `eval_run_task_results`
   with proper types, constraints, FKs, indexes, and idempotency.
2. Ensure project builds successfully (`npm run build`).
3. Update test command usage/docs for Jest 30 (`--testPathPatterns`).
4. Correct coverage config to reflect intended coverage targets.
5. (Optional but recommended) add at least one migration/schema test or verification script for new eval tables.
