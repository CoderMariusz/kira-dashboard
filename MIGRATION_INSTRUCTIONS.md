# US-8.1: Database Migration - Epic/Story Hierarchy

## Implementation Status

✅ **Migration file created:** `supabase/migrations/20260206_epic_story_hierarchy.sql`

This migration implements the epic/story hierarchy feature with the following components:

### 1. Schema Changes
- ✅ Added `parent_id` column to `tasks` table with foreign key reference to `tasks(id)` with `ON DELETE CASCADE`
- ✅ Added index on `parent_id` for query performance
- ✅ Added `household_id_lookup` index for internal queries

### 2. Constraints
- ✅ **No self-reference:** Constraint `chk_tasks_no_self_reference` prevents a task from being its own parent
- ✅ **Max 2 levels depth:** Function `check_task_depth_max_2()` and trigger `trg_check_task_depth` enforce max 2 levels (epic → story, no deeper)
- ✅ **Same household:** Function `check_parent_child_same_household()` and trigger `trg_check_parent_child_household` ensure parent and child belong to the same household

### 3. RLS Policies
- ✅ Updated SELECT policy for tasks to support parent-based queries
- ✅ Updated INSERT/UPDATE policy to maintain household consistency with parent_id

### 4. Helper Functions
- ✅ `get_epic_with_stories(epic_id)` - Returns epic with nested stories as JSONB
- ✅ `get_stories_for_epic(epic_id)` - Returns only stories for an epic
- ✅ `is_epic(task_id)` - Checks if a task has children (is an epic)

All functions respect RLS policies and enforce household isolation.

## How to Apply the Migration

### Option 1: Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://supabase.com)
2. Select your project: `kira-dashboard`
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/20260206_epic_story_hierarchy.sql`
6. Paste into the SQL editor
7. Click **Run** (▶️)
8. Wait for completion (should see "Success" at bottom)

### Option 2: Supabase CLI (If installed)

```bash
cd /Users/mariuszkrawczyk/CoderMariusz/kira-dashboard

# Push migration to remote
supabase db push

# Or apply specific migration
supabase db push --dry-run  # Preview changes
supabase db push            # Apply changes
```

### Option 3: psql (If PostgreSQL client installed)

```bash
# Get connection string from Supabase Dashboard → Settings → Database
# Look for "Connection string" (PostgreSQL)

psql "postgresql://postgres:[password]@[host]:[port]/postgres" \
  -f supabase/migrations/20260206_epic_story_hierarchy.sql
```

## Verify Migration Applied

After applying the migration, run the tests to verify everything works:

```bash
cd /Users/mariuszkrawczyk/CoderMariusz/kira-dashboard

# Run just the migration tests
npm test src/__tests__/US-8.1/migration.test.ts

# Run all US-8.1 tests
npm test src/__tests__/US-8.1/

# Or with watch mode
npm run test:watch src/__tests__/US-8.1/
```

## Expected Test Results

### Before Migration (Current State)
```
FAIL  src/__tests__/US-8.1/migration.test.ts    (6 failed)
FAIL  src/__tests__/US-8.1/rls.test.ts          (8 failed)
FAIL  src/__tests__/US-8.1/helpers.test.ts      (17 failed)
Total: 31 failed
```

### After Migration (Expected)
```
PASS  src/__tests__/US-8.1/migration.test.ts    (6 passed)
PASS  src/__tests__/US-8.1/rls.test.ts          (8 passed)
PASS  src/__tests__/US-8.1/helpers.test.ts      (17 passed)
Total: 31 passed
```

## Migration Details

### Functions Created

#### 1. `check_task_depth_max_2()`
Validates that tasks don't exceed 2 levels of depth:
- Level 0: Epic (no parent)
- Level 1: Story (parent is epic)
- Level 2+: Prevented ❌

Used by trigger `trg_check_task_depth` on INSERT and UPDATE.

#### 2. `check_parent_child_same_household()`
Validates that parent and child belong to the same household:
- Gets parent's household via `tasks → board → household`
- Gets child's household via `tasks → board → household`
- Raises error if households differ

Used by trigger `trg_check_parent_child_household` on INSERT and UPDATE.

#### 3. `get_epic_with_stories(epic_id UUID)`
Returns epic record with nested stories array.

**Example usage:**
```sql
SELECT * FROM get_epic_with_stories('12345678-1234-1234-1234-123456789012');
```

**Returns:**
```json
{
  "id": "...",
  "title": "My Epic",
  "stories": [
    {"id": "...", "title": "Story 1", "parent_id": "..."},
    {"id": "...", "title": "Story 2", "parent_id": "..."}
  ]
}
```

#### 4. `get_stories_for_epic(epic_id UUID)`
Returns all stories (direct children) for an epic.

**Example usage:**
```sql
SELECT * FROM get_stories_for_epic('12345678-1234-1234-1234-123456789012');
```

#### 5. `is_epic(task_id UUID)`
Returns boolean indicating if task has children.

**Example usage:**
```sql
SELECT * FROM is_epic('12345678-1234-1234-1234-123456789012');
```

## Notes

- All migrations use `IF NOT EXISTS` and `DROP IF EXISTS` to be idempotent
- Functions use `SECURITY DEFINER` so they respect the calling user's RLS policies
- The migration is backward compatible - existing tasks without `parent_id` continue to work
- Cascade delete ensures that deleting an epic also deletes all child stories
- Household isolation is enforced at the database level, not just the application level

## Rollback (If needed)

To remove this migration (not recommended in production):

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS trg_check_task_depth ON tasks;
DROP TRIGGER IF EXISTS trg_check_parent_child_household ON tasks;

-- Drop functions
DROP FUNCTION IF EXISTS check_task_depth_max_2();
DROP FUNCTION IF EXISTS check_parent_child_same_household();
DROP FUNCTION IF EXISTS get_epic_with_stories(epic_id UUID);
DROP FUNCTION IF EXISTS get_stories_for_epic(epic_id UUID);
DROP FUNCTION IF EXISTS is_epic(task_id UUID);

-- Drop constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_no_self_reference;

-- Drop indexes
DROP INDEX IF EXISTS idx_tasks_parent_id;
DROP INDEX IF EXISTS idx_tasks_household_lookup;

-- Drop column
ALTER TABLE tasks DROP COLUMN IF EXISTS parent_id;
```

## Files Created/Modified

### Created
- ✅ `supabase/migrations/20260206_epic_story_hierarchy.sql` - Main migration file

### Modified
- ✅ `vitest.config.ts` - Updated to load test environment variables from `.env.test`

### Added
- ✅ `.env.test` - Test environment variables (VITE_SUPABASE_URL, etc.)

## References

- **Sprint:** `~/.openclaw/workspace/sprint/US-8.1/SPRINT.md`
- **Tests:** `src/__tests__/US-8.1/`
  - `migration.test.ts` - Tests for column, constraints, indexes
  - `rls.test.ts` - Tests for RLS policies and household isolation
  - `helpers.test.ts` - Tests for helper functions
