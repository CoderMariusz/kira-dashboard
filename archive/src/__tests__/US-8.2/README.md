# US-8.2: API Endpoints — Epic/Story CRUD Tests

**PHASE 2: TEST WRITING** ✅ COMPLETE

All tests are designed to **FAIL INITIALLY** because the API routes and hooks do not exist yet.

## 📊 Test Summary

### Total: 71 FAILING Tests

## 📁 Test Files Created

### 1. **api-get.test.ts** (15 tests)
Tests for GET endpoints that retrieve epics and stories.

**Coverage:**
- `GET /api/epics` — List all epics with story count
  - AC1.1-AC1.5: Authentication, household validation, list retrieval, story count
- `GET /api/epics/[id]` — Single epic with nested stories
  - AC1.6-AC1.10: Authentication, 404 handling, household validation, nested stories
- `GET /api/epics/[id]/stories` — Stories for an epic
  - AC1.11-AC1.15: Authentication, 404/403 handling, empty arrays

### 2. **api-mutations.test.ts** (22 tests)
Tests for POST/PUT/DELETE endpoints that modify data.

**Coverage:**
- `POST /api/epics` — Create epic
  - AC2.1-AC2.6: Authentication, household validation, title validation, type='epic', household_id set
- `POST /api/epics/[id]/stories` — Create story under epic
  - AC2.7-AC2.12: Authentication, 404/403 handling, title validation, type='story', parent_id=epicId
- `PUT /api/tasks/[id]/parent` — Move story to different epic
  - AC2.13-AC2.17: Authentication, 404/403 handling, parent_id update
- `DELETE /api/epics/[id]` — Delete epic (cascade stories)
  - AC2.18-AC2.22: Authentication, 404/403 handling, cascade delete, success response

### 3. **hooks.test.ts** (17 tests)
Tests for React Query hooks that manage state and mutations.

**Coverage:**
- `useEpics()` — List of epics
  - AC3.1-AC3.4: Fetch on mount, story_count included, loading/error states
- `useEpic(id)` — Single epic with stories
  - AC3.5-AC3.7: Fetch by ID, nested stories, error handling
- `useCreateEpic()` — Create epic mutation
  - AC3.8-AC3.11: Mutation function, successful creation, cache invalidation, error state
- `useCreateStory(epicId)` — Create story mutation
  - AC3.12-AC3.14: Mutation function, story creation, cache invalidation
- `useMoveStory()` — Move story mutation
  - AC3.15-AC3.17: Mutation function, successful move, cache invalidation for both epics

### 4. **validation.test.ts** (17 tests)
Tests for input validation and error handling.

**Coverage:**
- Epic Validation (AC4.1-AC4.4)
  - Title required, empty title rejection, max 255 chars
- Story Validation (AC4.5-AC4.8)
  - Parent_id required, title required, max 255 chars
- Story Nesting Prevention (AC4.9-AC4.11)
  - Cannot create story under story
  - Cannot move story to story
  - Cannot move to non-existent parent
- Error Handling (AC5.1-AC5.6)
  - 400 validation errors with descriptive messages
  - 403 access denied for wrong household
  - 404 not found errors
  - 401 unauthenticated
  - 500 database errors
  - Consistent error field in all responses

## ✅ Acceptance Criteria Mapping

| AC | Tests | Coverage |
|-------|-------|----------|
| AC1: GET Endpoints | 15 | 100% |
| AC2: POST/PUT/DELETE | 22 | 100% |
| AC3: React Query Hooks | 17 | 100% |
| AC4: Validation | 11 | 100% |
| AC5: Error Handling | 6 | 100% |

## 🧪 How to Run

```bash
# Run all US-8.2 tests
npm run test -- src/__tests__/US-8.2/

# Run specific test file
npm run test -- src/__tests__/US-8.2/api-get.test.ts

# Run with coverage
npm run test:coverage -- src/__tests__/US-8.2/
```

## 🎯 Expected Behavior

**ALL 71 TESTS WILL FAIL** because:
- API routes don't exist: `src/app/api/epics/...`
- Hooks don't exist: `src/hooks/useEpics.ts`
- Database tables not set up (blocked by US-8.1)

## 📝 Test Design

Each test:
1. Mocks Supabase client using table-aware mock pattern (Lesson 8)
2. Tests a single acceptance criterion
3. Follows naming convention: `it('AC#.N: description')`
4. Uses `@ts-expect-error` comments for non-existent code
5. Validates both success and error paths
6. Tests boundaries (empty strings, max lengths)
7. Validates household isolation (security)

## 🔗 Dependencies

- vitest (test runner)
- @testing-library/react (for hook testing)
- @tanstack/react-query (React Query)
- NextRequest (Next.js API testing)

## 📦 Next Steps (PHASE 3)

After tests are written:
1. Implement GET endpoints
2. Implement POST/PUT/DELETE endpoints
3. Create React Query hooks
4. Ensure all 71 tests pass
5. Add coverage metrics tracking

