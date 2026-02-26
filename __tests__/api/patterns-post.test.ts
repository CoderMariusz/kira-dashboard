/**
 * __tests__/api/patterns-post.test.ts
 * STORY-8.2 — Original filesystem-based POST /api/patterns + POST /api/lessons tests.
 * SUPERSEDED by patterns-supabase.test.ts (STORY-12.11).
 *
 * The POST endpoints were migrated from local file writes to Supabase
 * in STORY-12.11. All acceptance criteria are now covered by
 * __tests__/api/patterns-supabase.test.ts.
 */

describe('POST /api/patterns + /api/lessons — legacy (STORY-8.2, superseded by STORY-12.11)', () => {
  it('is covered by patterns-supabase.test.ts', () => {
    expect(true).toBe(true)
  })
})
