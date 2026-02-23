# EPIC-5 Review — Wave 2
**Reviewed:** STORY-5.2 + STORY-5.9  
**Reviewer:** Claude Sonnet (subagent)  
**Date:** 2026-02-23  
**Time spent reviewing:** 12 min

---

## Summary

| Story | Verdict |
|---|---|
| STORY-5.2 — PATCH /api/models/[alias] | ✅ **APPROVED** |
| STORY-5.9 — Hybrid Mode sync + fallback API | ✅ **APPROVED** |

**Overall: Both stories ready to merge.** All ACs pass. Issues listed below are non-blocking.

---

## STORY-5.2 — PATCH /api/models/[alias]

### ✅ Checklist

1. **PATCH returns updated ModelEntry with live Bridge stats?** ✅  
   `buildModelEntry()` calls `fetchBridge<RunsResponse>('/api/status/runs')` and computes full stats. When Bridge offline, `stats: null` (correct per spec).

2. **Unknown alias → 404 (not 500)?** ✅  
   `resolveModelKey(alias)` returns null → `return NextResponse.json({ error: ... }, { status: 404 })`. Cannot reach 500.

3. **Negative values → 400?** ✅  
   Zod `.min(0, 'Cena nie może być ujemna')` + `parsed.error.issues[0]?.message` extraction. Correct.

4. **Values > 1000 → 400?** ✅  
   Zod `.max(1000, 'Cena nie może przekraczać 1000 USD')`. Correct.

5. **Empty body → 400 (not 200/no-op)?** ✅  
   `.refine()` check: at least one field must be defined. `{}` → 400 `"Podaj co najmniej jedno pole do aktualizacji"`.

6. **Auth: ADMIN only via requireAdmin()?** ✅  
   `requireAdmin()` is the *first* call before any DB/Bridge access. ✅

7. **lib/model-overrides.ts interface consistent between PATCH and GET?** ✅  
   STORY-5.2 updates **both** `lib/model-overrides.ts` (new interface: `cost_input_per_1m`/`cost_output_per_1m`) **and** `app/api/models/route.ts` (now uses same field names). Both sides aligned.

8. **TypeScript strict — no `any`?** ✅  
   `npx tsc --noEmit` on `feature/STORY-5.2` → **zero errors**. No `any` types visible in any changed file.

### ⚠️ Non-blocking Issues

#### [STORY-5.2-I1] Auth status code diverges from spec (minor)
- **File:** `lib/utils/require-admin.ts` (shared utility)
- **Spec says:** Non-ADMIN → HTTP 401
- **Actual:** 401 for unauthenticated, **403** for authenticated non-ADMIN
- **Impact:** Better security practice; consistent with rest of codebase. The PATCH handler passes through `auth.response` directly (no hardcoded 401), so it's correct by design. Flag for spec alignment only.

#### [STORY-5.2-I2] Missing `Cache-Control: no-store` on PATCH response
- **File:** `app/api/models/[alias]/route.ts` (entire file)
- **Issue:** GET `/api/models` sets `Cache-Control: no-store` but PATCH response doesn't.
- **Impact:** Cosmetic / defensive hygiene. Not a bug.

#### [STORY-5.2-I3] `buildModelEntry()` fetches ALL runs just for one model's stats
- **File:** `app/api/models/[alias]/route.ts:74`
- **Issue:** Calls `/api/status/runs` (full dataset) then filters to one model's runs. Duplicate pattern of GET, slightly wasteful.
- **Impact:** Functional, consistent with GET behavior. Consider extracting shared stats-builder to `lib/model-stats.ts` in future refactor.

---

## STORY-5.9 — Hybrid Mode sync + fallback API

### ✅ Checklist

1. **GET /api/sync/status returns `{ source: "supabase", synced_at, epics[] }`?** ✅  
   Response type `SyncStatusResponse` enforced. Also includes `projects[]` (additive, matches spec shape). `source: 'supabase'` literal type in `types/api.ts`.

2. **GET /api/sync/runs supports `?project` and `?limit` params correctly?** ✅  
   - `project` → `.eq('project_id', project)` applied only when present.
   - `limit`: defaults 50, max 200, `isNaN` guard present, negative → default. ✅

3. **Both routes: ADMIN-only auth before Supabase query?** ✅  
   `requireAdmin()` is the first statement in both route handlers, before `createClient()`.

4. **usePipeline fallback: `NEXT_PUBLIC_BRIDGE_MODE=offline` → uses /api/sync/status?** ✅  
   `IS_FORCED_OFFLINE` constant evaluated at build time (correct for `NEXT_PUBLIC_*`). When true: SWR key for bridge is `null` (no fetch), `useSyncFallback=true`, hook calls `fetchSyncStatus()`.

5. **OfflineBanner: color-coded by staleness?** ✅  
   `getStaleness()` in `OfflineBanner.tsx`:
   - `< 30min` → `bg-yellow-500/15` ✅
   - `30–60min` → `bg-orange-500/15` ✅
   - `> 60min` → `bg-red-500/15` ✅
   - `null syncedAt` → orange (safe fallback) ✅

6. **Sync script: correct SQL for all 4 tables? JSON normalization? Timestamp conversion?** ✅  
   - All 4 tables: `projects`, `epics`, `stories`, `runs` — explicit column SELECTs.
   - `normalize_json()`: handles `""`, `"null"`, `"NULL"`, `"[]"`, invalid JSON → `[]`. ✅
   - `normalize_ts()`: strips whitespace, returns None for empty. ✅
   - `normalize_text()`: empty string → None for optional TEXT fields. ✅
   - FK order: projects → epics → stories → runs. ✅

7. **Batch upsert (100/req)? 30-day limit on runs?** ✅  
   `batch_size = 100` in `SupabaseClient.upsert()`. `CUTOFF_DAYS = 30`, `WHERE started_at >= ?`. ✅

8. **No sensitive keys hardcoded?** ✅  
   Script uses `os.environ.get("SUPABASE_URL")` and `os.environ.get("SUPABASE_SERVICE_KEY")`. Validates and exits with 1 if missing. No hardcoded keys anywhere.

### ⚠️ Non-blocking Issues

#### [STORY-5.9-I1] Stale `.next/types` causes false-positive TSC error on branch switch
- **Context:** CI / DX
- **Detail:** `.next/types/validator.ts` is in `tsconfig.json` `include`. When switching from `feature/STORY-5.2` (which has `app/api/models/[alias]/route.ts`) to `feature/STORY-5.9` (which doesn't), stale `.next/types/validator.ts` references the missing file → `TS2307`.
- **Fix:** `rm -rf .next/types` before running `tsc --noEmit` on STORY-5.9 alone. After clearing: **zero errors**.
- **Root cause:** Branch-switching with stale build artifacts. Not a code bug. Consider adding `.next/types` cleanup to CI step.

#### [STORY-5.9-I2] `synced_at` in `/api/sync/status` computed from projects+epics only
- **File:** `app/api/sync/status/route.ts:73-80`
- **Issue:** `allSyncedAt` collects `synced_at` from projects and epics but NOT stories.
- **Impact:** Zero in practice — sync script writes the same `now` timestamp to all tables. Stories' `synced_at` would always equal epics'. Cosmetic inconsistency.

#### [STORY-5.9-I3] `sync_stories` SELECTs unused columns `merge_commit`, `last_checkpoint`
- **File:** `kira/scripts/sync_bridge_to_supabase.py:138-140`
- **Issue:** `SELECT` includes `merge_commit, last_checkpoint` but neither column appears in the `rows.append({...})` dict → they're fetched but never sent to Supabase.
- **Impact:** Harmless. Either remove from SELECT or add to payload if Supabase schema has those columns.

#### [STORY-5.9-I4] Dead code branch in `normalize_json()`
- **File:** `kira/scripts/sync_bridge_to_supabase.py:95-102`
- **Issue:**
  ```python
  if not val or val.strip() in ("", "null", "NULL", "[]"):
      if val and val.strip() == "[]":   # ← dead: already matched outer "[]" check
          return []
      return []
  ```
  The inner `if val and val.strip() == "[]"` is unreachable — `"[]"` is already matched by the outer condition. Both branches return `[]` anyway.
- **Impact:** Cosmetic. Remove inner `if` block.

#### [STORY-5.9-I5] Type-cast hack in `/api/sync/status` for raw Supabase epic rows
- **File:** `app/api/sync/status/route.ts:63-69`
- **Issue:** Raw Supabase rows cast `as BridgeSyncEpic[]` before `.map()` adds `stories`. This means TypeScript believes `stories` already exists on the raw rows (it doesn't). Code works at runtime but bypasses type safety.
- **Suggested fix:** Define a raw type `BridgeSyncEpicRow` (without `stories`) and use it for the DB result before enriching.
- **Impact:** Minor type-safety gap. Does not cause runtime errors.

---

## Edge Case Trace

### STORY-5.2

| Input | Expected | Actual |
|---|---|---|
| `PATCH /api/models/SONNET` | 200 (resolveModelKey lowercases) | ✅ `resolveModelKey` calls `.toLowerCase()` |
| `PATCH /api/models/unknown-xyz` | 404 | ✅ returns 404 before any side effects |
| `{ "cost_input_per_1m": -1 }` | 400 "Cena nie może być ujemna" | ✅ Zod .min(0) |
| `{ "cost_output_per_1m": 1001 }` | 400 "Cena nie może przekraczać 1000 USD" | ✅ Zod .max(1000) |
| `{}` (empty body) | 400 "Podaj co najmniej jedno pole" | ✅ .refine() |
| `{ "cost_input_per_1m": null }` | 400 (null ≠ number) | ✅ Zod z.number() rejects null |
| Malformed JSON body | 400 "Nieprawidłowy JSON" | ✅ try/catch on request.json() |
| No JWT | 401 | ✅ requireAdmin() → 401 |
| Valid JWT, role HELPER | 403 | ✅ requireAdmin() → 403 |

### STORY-5.9

| Input | Expected | Actual |
|---|---|---|
| `GET /api/sync/runs?limit=abc` | limit = 50 (default) | ✅ `isNaN(rawLimit)` guard |
| `GET /api/sync/runs?limit=0` | limit = 50 (default) | ✅ `rawLimit < 1` guard |
| `GET /api/sync/runs?limit=999` | limit = 200 (max) | ✅ `Math.min(rawLimit, MAX_LIMIT)` |
| `NEXT_PUBLIC_BRIDGE_MODE=offline` | useSyncFallback=true, no Bridge calls | ✅ SWR key = null for Bridge |
| Bridge returns null (offline) | Falls back to Supabase | ✅ `bridgeOffline` → `useSyncFallback=true` |
| `syncedAt` = null | Orange banner, no crash | ✅ handled in getStaleness() |
| `SUPABASE_URL` not set | exit code 1, clear message | ✅ validation in main() |
| `data/bridge.db` not found | exit code 1, "Bridge DB not found" | ✅ `BRIDGE_DB.exists()` check |
| Supabase upsert fails | exit code 1, `RuntimeError` with context | ✅ `raise RuntimeError(...)` |

---

## Verdict

| Branch | TypeScript | Auth | Validation | Edge Cases | Spec Compliance |
|---|---|---|---|---|---|
| feature/STORY-5.2 | ✅ 0 errors | ✅ | ✅ | ✅ | ✅ |
| feature/STORY-5.9 | ✅ 0 errors* | ✅ | ✅ | ✅ | ✅ |

*After `rm -rf .next/types` to clear stale build artifacts.

### 🟢 Both stories APPROVED — ready to merge

**Merge order recommendation:**
1. `feature/STORY-5.2` first (updates `lib/model-overrides.ts` interface)
2. `feature/STORY-5.9` second (no dependency on 5.2 but cleaner history)

**Post-merge actions:**
- Add `rm -rf .next/types` step in CI before `tsc --noEmit`
- Verify `NEXT_PUBLIC_BRIDGE_MODE=offline` is set in Vercel production + preview environments (AC-12)
- Run sync script manually once to seed Supabase tables before Vercel deploy
