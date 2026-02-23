# EPIC-5 Review Wave 5 — STORY-5.5

**Reviewer:** Sonnet 4.6 (subagent)
**Branch:** feature/STORY-5.5
**Date:** 2026-02-23
**Time spent: 10 min**

---

## STORY-5.5: APPROVED ✅

---

## Files Reviewed

| File | Lines | Status |
|------|-------|--------|
| `app/(dashboard)/dashboard/models/page.tsx` | 9 | ✅ clean |
| `components/models/ModelsPage.tsx` | 152 | ✅ clean |
| `components/models/ModelCard.tsx` | 117 | ✅ clean |
| `components/models/MonitoringToggle.tsx` | 40 | ✅ clean |
| `components/models/ModelDetailPanel.tsx` | 17 | ✅ clean |

---

## TypeScript Check

```
npx tsc --noEmit → (no output) → PASSED ✅
```

No `any` types found. All interfaces properly typed. `StatFormat` is a union literal type (not `any`). Unused `alias` prop in `ModelDetailPanel` is part of the interface but not destructured — valid TypeScript, placeholder pattern.

---

## Checklist Results

### 1. Four States — ✅ ALL CORRECT

**isLoading guard order is correct:**
```
if (isLoading) → skeleton     ← checked FIRST ✅
if (error)     → offline UI   ← only reached when NOT loading ✅
if (models.length === 0) → empty
else → filled grid
```

- **Loading** (`ModelsPage.tsx:105`): 2 skeleton cards with `animate-pulse`, correct bg colors (`bg-[#1a1730]`, `border-[#2a2540]`), 3 bars per skeleton. Header shows `"..."` badge. ✅
- **Error/Offline** (`ModelsPage.tsx:115`): ⚠️ icon, "Bridge niedostępny" text, "Spróbuj ponownie" button with `opacity-50 cursor-not-allowed` when retrying. ✅
- **Empty** (`ModelsPage.tsx:125`): 🤖 emoji with `role="img"` a11y attr, "Brak skonfigurowanych modeli. Dodaj modele w bridge.yml." centered in `text-slate-400`. ✅
- **Filled** (`ModelsPage.tsx:131`): `grid-cols-1 lg:grid-cols-2 gap-4 mt-6`, maps ModelCard per model. ✅

### 2. Stats Formatting — ✅ CORRECT

Verified via live Node.js test:

| Input | Format | Output | Expected | Match |
|-------|--------|--------|----------|-------|
| 42 | runs | `"42"` | `"Runs: 42"` | ✅ |
| 0.857 | percent | `"86%"` | `"Success: 86%"` | ✅ |
| 3.2 | seconds | `"3.2s"` | `"Avg: 3.2s"` | ✅ |
| 0.135 | cost | `"$0.14"` | `"Cost: $0.14"` | ✅ |
| null | any | `"—"` | `"—"` | ✅ |
| undefined | any | `"—"` | `"—"` | ✅ |
| 0 | percent | `"0%"` | correct (not null) | ✅ |

`formatStat` in `ModelCard.tsx:25–34` guards `null || undefined`. Stats use optional chaining `stats?.total_runs ?? null` — safe against `stats: null`.

### 3. Monitoring Toggle — ✅ (with known limitation, deferred to STORY-5.7)

- `MonitoringToggle.tsx`: Reads localStorage via `useEffect` on mount (`isModelMonitored(alias)`). ✅
- Updates via `setModelMonitoring(alias, next)` on click. ✅
- Toggle visual: `bg-[#818cf8]` when enabled / `bg-slate-600` when disabled. CSS `translate-x-4` / `translate-x-0.5` for knob. ✅
- `e.stopPropagation()` prevents accidental card expand on toggle click. ✅

**Known limitation (acceptable, deferred to STORY-5.7):**
- `ModelCard` computes `monitored = isModelMonitored(...)` at render time. After a toggle click, the `MonitoringToggle` updates its own state and localStorage, but the parent `ModelCard` does NOT re-render — so `opacity-50` and "Wyłączony" badge won't update in real-time until next page refresh.
- This is consistent with the spec stating full toggle implementation is STORY-5.7.

**Minor hydration note:** `useState(true)` hardcoded as initial state before `useEffect` reads localStorage. This causes a one-render flash where all toggles appear "enabled" before hydration. Acceptable for Next.js SSR pattern with localStorage.

### 4. Expand/Collapse — ✅ CORRECT

- Single `expandedAlias: string | null` in `ModelsPage`. Only one card can be expanded at a time. ✅
- `handleToggleExpand` uses functional update: `prev === canonicalKey ? null : canonicalKey` — idiomatic toggle. ✅
- Button text: `{isExpanded ? '▲' : '▼'} Szczegóły` (`ModelCard.tsx:97`). ✅
- Panel renders with `border-t border-[#2a2540] pt-4` separator. ✅

**Minor UX note:** The "Edytuj ceny" button (`ModelCard.tsx:87`) also calls `onToggleExpand`. This opens the detail panel when clicking "Edit prices". Intentional for placeholder — will be replaced in STORY-5.6.

### 5. Auth — ⚠️ PRE-EXISTING ISSUE (not STORY-5.5 scope)

- `app/(dashboard)/layout.tsx` — no auth check.
- `lib/supabase/middleware.ts` — `updateSession()` function exists and is correct.
- **`middleware.ts` in project root: MISSING** — the Supabase middleware is never invoked by Next.js.
- Impact: ALL dashboard routes are potentially unprotected at middleware level.
- **This is pre-existing** (not introduced by STORY-5.5, confirmed via git diff).
- Recommendation: Restore root `middleware.ts` (archived version exists in `archive/middleware.ts` and is correct).

### 6. TypeScript Strict — ✅ NO any

- `tsc --noEmit` → clean, zero errors.
- All prop interfaces typed: `ModelCardProps`, `MonitoringToggleProps`, `ModelDetailPanelProps`, `HeaderProps`, `OfflineStateProps`.
- `StatFormat` is a proper union type: `'runs' | 'percent' | 'seconds' | 'cost'`.
- `as const` used correctly in stats array (`ModelCard.tsx:74`).
- `KeyedMutator<ModelEntry[]>` properly typed in hook result.

### 7. Tailwind Classes — ✅ CONSISTENT

All project color tokens correctly applied:

| Token | Class | Usage |
|-------|-------|-------|
| bg page | `bg-[#0d0c1a]` | `page.tsx` wrapper ✅ |
| card bg | `bg-[#1a1730]` | card + skeleton ✅ |
| card border | `border-[#2a2540]` | card + separator ✅ |
| accent | `text-[#818cf8]` / `bg-[#818cf8]` | badges, buttons ✅ |
| Provider circles | `bg-[#7c3aed]` / `bg-[#3b82f6]` / `bg-[#22c55e]` / `bg-[#ef4444]` | ✅ |
| Disabled | `opacity-50` | card isDisabled ✅ |
| "Wyłączony" badge | `bg-slate-600 text-slate-300` | ✅ |

Responsive grid: `grid-cols-1 lg:grid-cols-2` — matches spec. ✅

---

## Try-to-Break Scenarios

| Scenario | Result |
|----------|--------|
| `stats: null` | All stat badges show "—". Cost row still renders `$X.XX / 1M` from static fields. ✅ |
| `models: []` | Empty state renders correctly, badge shows "0 aktywnych". ✅ |
| `error` during loading | isLoading guard fires first — error UI never shown during initial fetch. ✅ |
| `provider` not in PROVIDER_COLORS | Falls back to `bg-slate-600`. `??` operator handles unknown providers. ✅ |
| `model.provider[0]` when provider is empty string | Would render empty string in circle, but `?? '?'` saves it via `providerInitial`. ✅ |
| `avg_duration_s: null` (stats exist, field null) | `stats?.avg_duration_s ?? null` → `null` → `"—"`. ✅ |
| Multiple cards toggling expand | `handleToggleExpand` with functional setState. Clicking card A when B is open closes B and opens A atomically. ✅ |
| Auth bypass | Dashboard accessible without login (pre-existing middleware issue). ⚠️ |

---

## Issues Summary

### 🔴 Blockers (merge-blocking)
_None_

### 🟡 Minor Issues (non-blocking)

| # | File:Line | Issue |
|---|-----------|-------|
| 1 | `components/models/ModelDetailPanel.tsx:9` | `alias` prop declared in interface but not used in component body. Harmless placeholder pattern. |
| 2 | `components/models/MonitoringToggle.tsx:12` | `useState(true)` hardcoded initial state causes SSR/client hydration flash before `useEffect` corrects from localStorage. Acceptable for placeholder. |
| 3 | `components/models/ModelCard.tsx:87` | "Edytuj ceny" button calls `onToggleExpand` — conflates two UX actions. Acceptable for placeholder, needs split in STORY-5.6. |
| 4 | `components/models/ModelsPage.tsx` | Component named `ModelsPage` (file: `ModelsPage.tsx`) vs spec which specified `ModelsGrid` / `ModelsGrid.tsx`. Functional difference: none. |

### ⚪ Pre-existing (not STORY-5.5 scope)

| # | File | Issue |
|---|------|-------|
| 5 | `middleware.ts` (missing from root) | Auth middleware not wired — all dashboard routes unprotected. Archive version correct at `archive/middleware.ts`. Should be restored before production. |

---

## Verdict

**✅ READY TO MERGE**

STORY-5.5 is a clean, well-structured implementation. All 4 UI states work correctly with proper guard ordering (isLoading before error). Stats formatting is accurate. TypeScript is strict and clean. Tailwind is consistent with project palette. Expand/collapse is correctly scoped to a single panel at a time.

The monitoring toggle real-time sync limitation is intentional and explicitly deferred to STORY-5.7. No blockers found.

The pre-existing missing root `middleware.ts` should be tracked as a separate issue and restored before this feature goes to production, but it does not block STORY-5.5 merge.

---

_Report generated by: epic5-story55-review subagent_
