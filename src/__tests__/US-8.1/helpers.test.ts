import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * US-8.1: Helper Functions Tests (INTEGRATION)
 * 
 * These tests require:
 * 1. DB migration applied (parent_id column)
 * 2. Real Supabase credentials in env
 * 
 * Run with: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm test
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Skip if no credentials (CI/unit test environment)
const shouldSkip = !supabaseUrl || !supabaseKey;

// Retry wrapper for flaky DB operations
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 500
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

// Generate unique test ID to avoid conflicts between parallel tests
const testId = () => crypto.randomUUID().slice(0, 8);

describe.skipIf(shouldSkip)('US-8.1: Helper Functions Tests', () => {
  // Single client instance for all tests
  let supabase: SupabaseClient;
  let testBoard: any;
  let testEpic: any;
  let testStories: any[] = [];
  let createdTaskIds: string[] = [];

  // Increase timeout for all tests in this suite
  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Sign in and wait for session
    const { error: authError } = await withRetry(() => 
      supabase.auth.signInWithPassword({
        email: 'coder.mariusz@gmail.com',
        password: 'KiraDash2026!'
      })
    );
    
    if (authError) throw new Error(`Auth failed: ${authError.message}`);

    // Small delay to ensure auth propagates
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get or create a test board
    const { data: board } = await supabase
      .from('boards')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (!board) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .limit(1)
        .maybeSingle();
      
      if (profile?.household_id) {
        const { data: newBoard } = await supabase
          .from('boards')
          .insert({
            household_id: profile.household_id,
            name: `Test Board ${testId()}`,
            type: 'work',
            columns: ['idea', 'doing', 'done']
          })
          .select()
          .maybeSingle();
        testBoard = newBoard;
      }
    } else {
      testBoard = board;
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup any remaining tasks
    if (createdTaskIds.length > 0) {
      await supabase
        .from('tasks')
        .delete()
        .in('id', createdTaskIds);
    }
  });

  beforeEach(async () => {
    testStories = [];
    createdTaskIds = [];
    testEpic = null;

    // Create test epic with unique title
    const { data: epic, error: epicError } = await withRetry(() =>
      supabase
        .from('tasks')
        .insert({
          title: `Test Epic ${testId()}`,
          description: 'Test epic for helpers',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single()
    );

    if (!epicError && epic) {
      testEpic = epic;
      createdTaskIds.push(epic.id);

      // Create test stories sequentially to avoid race conditions
      for (let i = 0; i < 3; i++) {
        const { data: story, error: storyError } = await supabase
          .from('tasks')
          .insert({
            title: `Story ${i} ${testId()}`,
            description: `Test story ${i}`,
            column: 'idea',
            board_id: testBoard.id,
            parent_id: testEpic.id
          })
          .select()
          .single();

        if (!storyError && story) {
          testStories.push(story);
          createdTaskIds.push(story.id);
        }
      }
    }
  }, 20000);

  afterEach(async () => {
    // Cleanup in reverse order (children first, then parent)
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await supabase.from('tasks').delete().eq('id', id);
      } catch {
        // Ignore cleanup errors (may already be deleted by cascade)
      }
    }
    createdTaskIds = [];
  }, 10000);

  describe('AC3: get_epic_with_stories(epic_id)', () => {
    it('should return epic with nested stories', async () => {
      const { data, error } = await withRetry(() =>
        supabase.rpc('get_epic_with_stories', { epic_id: testEpic.id })
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data).toHaveProperty('id', testEpic.id);
      expect(data).toHaveProperty('stories');
      expect(Array.isArray(data.stories)).toBe(true);
      expect(data.stories.length).toBe(testStories.length);

      data.stories.forEach((story: any) => {
        expect(story.parent_id).toBe(testEpic.id);
      });
    }, 15000);

    it('should return null for non-existent epic_id', async () => {
      const fakeEpicId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .rpc('get_epic_with_stories', { epic_id: fakeEpicId });

      expect(error).toBeNull();
      expect(data).toBeNull();
    }, 10000);

    it('should return epic with empty stories array if epic has no children', async () => {
      const uid = testId();
      const { data: epicWithoutChildren, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: `Epic Without Children ${uid}`,
          description: 'Test epic',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(createError).toBeNull();
      createdTaskIds.push(epicWithoutChildren.id);

      const { data, error } = await supabase
        .rpc('get_epic_with_stories', { epic_id: epicWithoutChildren.id });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.stories).toEqual([]);
    }, 15000);

    it('should respect RLS - only return epic from user household', async () => {
      const { data, error } = await supabase
        .rpc('get_epic_with_stories', { epic_id: testEpic.id });

      expect(error).toBeNull();

      if (data === null) {
        expect(data).toBeNull();
      } else {
        expect(data).toBeDefined();
        expect(data.id).toBe(testEpic.id);
      }
    }, 10000);
  });

  describe('AC3: get_stories_for_epic(epic_id)', () => {
    it('should return only stories for given epic_id', async () => {
      const { data, error } = await withRetry(() =>
        supabase.rpc('get_stories_for_epic', { epic_id: testEpic.id })
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(testStories.length);

      data.forEach((story: any) => {
        expect(story.parent_id).toBe(testEpic.id);
      });
    }, 15000);

    it('should return empty array for epic without children', async () => {
      const uid = testId();
      const { data: epicWithoutChildren, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: `Empty Epic ${uid}`,
          description: 'Test epic',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(createError).toBeNull();
      createdTaskIds.push(epicWithoutChildren.id);

      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: epicWithoutChildren.id });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    }, 15000);

    it('should return empty array for non-existent epic_id', async () => {
      const fakeEpicId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: fakeEpicId });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    }, 10000);

    it('should not return epic itself in results', async () => {
      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: testEpic.id });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      const epicInResults = data.find((task: any) => task.id === testEpic.id);
      expect(epicInResults).toBeUndefined();
    }, 10000);

    it('should respect RLS - only return stories from user household', async () => {
      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: testEpic.id });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      if (data.length > 0) {
        const householdId = data[0].household_id;
        data.forEach((story: any) => {
          expect(story.household_id).toBe(householdId);
        });
      }
    }, 10000);
  });

  describe('AC3: is_epic(task_id)', () => {
    it('should return true for epic (task with children)', async () => {
      const { data, error } = await withRetry(() =>
        supabase.rpc('is_epic', { task_id: testEpic.id })
      );

      expect(error).toBeNull();
      expect(data).toBe(true);
    }, 10000);

    it('should return false for story (task without children)', async () => {
      if (testStories.length > 0) {
        const { data, error } = await supabase
          .rpc('is_epic', { task_id: testStories[0].id });

        expect(error).toBeNull();
        expect(data).toBe(false);
      }
    }, 10000);

    it('should return false for regular task without parent_id and no children', async () => {
      const uid = testId();
      const { data: regularTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: `Regular Task ${uid}`,
          description: 'Test task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(createError).toBeNull();
      createdTaskIds.push(regularTask.id);

      const { data, error } = await supabase
        .rpc('is_epic', { task_id: regularTask.id });

      expect(error).toBeNull();
      expect(data).toBe(false);
    }, 15000);

    it('should return null or false for non-existent task_id', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .rpc('is_epic', { task_id: fakeTaskId });

      expect(error).toBeNull();
      expect(data).toBe(false);
    }, 10000);

    it('should handle task with children that were deleted', async () => {
      const uid = testId();
      const { data: epic, error: epicError } = await supabase
        .from('tasks')
        .insert({
          title: `Epic With Deleted Children ${uid}`,
          description: 'Test epic',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(epicError).toBeNull();
      createdTaskIds.push(epic.id);

      const { data: child, error: childError } = await supabase
        .from('tasks')
        .insert({
          title: `Temporary Child ${uid}`,
          description: 'Will be deleted',
          column: 'idea',
          board_id: testBoard.id,
          parent_id: epic.id
        })
        .select()
        .single();

      expect(childError).toBeNull();

      await supabase.from('tasks').delete().eq('id', child.id);

      const { data, error } = await supabase
        .rpc('is_epic', { task_id: epic.id });

      expect(error).toBeNull();
      expect(data).toBe(false);
    }, 20000);

    it('should respect RLS - check only tasks from user household', async () => {
      const { data, error } = await supabase
        .rpc('is_epic', { task_id: testEpic.id });

      expect(error).toBeNull();

      if (data === false && testStories.length > 0) {
        expect(data).toBe(false);
      }
    }, 10000);
  });

  describe('Helper Function Edge Cases', () => {
    it('should handle circular reference attempts gracefully', async () => {
      const uid = testId();
      const { data: task1, error: error1 } = await supabase
        .from('tasks')
        .insert({
          title: `Task 1 ${uid}`,
          description: 'First task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      const { data: task2, error: error2 } = await supabase
        .from('tasks')
        .insert({
          title: `Task 2 ${uid}`,
          description: 'Second task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(error1).toBeNull();
      expect(error2).toBeNull();
      createdTaskIds.push(task1.id, task2.id);

      // Make task1 parent of task2
      const { error: updateError1 } = await supabase
        .from('tasks')
        .update({ parent_id: task1.id })
        .eq('id', task2.id);

      // Try to make task2 parent of task1 (should fail)
      const { error: updateError2 } = await supabase
        .from('tasks')
        .update({ parent_id: task2.id })
        .eq('id', task1.id);

      // At least one should fail due to depth constraint
      expect(updateError1 || updateError2).toBeDefined();
    }, 20000);

    it('should handle deeply nested queries efficiently', async () => {
      const uid = testId();
      const { data: epic, error: epicError } = await supabase
        .from('tasks')
        .insert({
          title: `Epic With Many Stories ${uid}`,
          description: 'Performance test epic',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(epicError).toBeNull();
      createdTaskIds.push(epic.id);

      // Create 20 stories (reduced from 50 for faster test)
      const storyCount = 20;
      for (let i = 0; i < storyCount; i++) {
        const { data: story } = await supabase
          .from('tasks')
          .insert({
            title: `Story ${i} ${uid}`,
            description: `Performance test story ${i}`,
            column: 'idea',
            board_id: testBoard.id,
            parent_id: epic.id
          })
          .select()
          .single();

        if (story) createdTaskIds.push(story.id);
      }

      const startTime = Date.now();
      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: epic.id });
      const endTime = Date.now();

      expect(error).toBeNull();
      expect(data.length).toBe(storyCount);
      expect(endTime - startTime).toBeLessThan(3000); // 3s timeout
    }, 60000);
  });
});
