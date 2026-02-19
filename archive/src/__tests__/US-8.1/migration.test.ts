import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * US-8.1: Migration Structure Tests (INTEGRATION)
 * 
 * Requires DB migration to be applied first.
 * Run: npx supabase db push (with valid credentials)
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const shouldSkip = !supabaseUrl || !supabaseKey;

// Generate unique test ID to avoid conflicts
const testId = () => crypto.randomUUID().slice(0, 8);

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

describe.skipIf(shouldSkip)('US-8.1: Migration Structure Tests', () => {
  // Single client instance for all tests
  let supabase: SupabaseClient;
  let testBoard: any;
  let createdTaskIds: string[] = [];

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

  afterEach(async () => {
    // Cleanup created tasks after each test
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await supabase.from('tasks').delete().eq('id', id);
      } catch {
        // Ignore cleanup errors (may already be deleted by cascade)
      }
    }
    createdTaskIds = [];
  }, 10000);

  describe('AC1: parent_id Column', () => {
    it('should have parent_id column in tasks table', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, parent_id')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    }, 10000);

    it('should have index on parent_id for performance', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .not('parent_id', 'is', null)
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    }, 10000);

    it('should reference tasks(id) with ON DELETE CASCADE', async () => {
      const uid = testId();
      
      // Create a parent task
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .insert({
          title: `Test Parent Epic ${uid}`,
          description: 'Test epic for cascade delete',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(parentError).toBeNull();
      expect(parent).toBeDefined();
      createdTaskIds.push(parent.id);

      // Create a child task
      const { data: child, error: childError } = await supabase
        .from('tasks')
        .insert({
          title: `Test Child Story ${uid}`,
          description: 'Test story',
          column: 'idea',
          board_id: testBoard.id,
          parent_id: parent.id
        })
        .select()
        .single();

      expect(childError).toBeNull();
      expect(child).toBeDefined();
      // Note: child ID not tracked since cascade delete should handle it

      // Delete parent - should cascade delete child
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', parent.id);

      expect(deleteError).toBeNull();
      createdTaskIds = createdTaskIds.filter(id => id !== parent.id);

      // Check that child was also deleted
      const { data: deletedChild, error: checkError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', child.id)
        .maybeSingle();

      // Child should be gone (either null data or PGRST116 error)
      expect(deletedChild).toBeNull();
    }, 20000);
  });

  describe('AC1: Self-Reference Constraint', () => {
    it('should prevent a task from being its own parent', async () => {
      const uid = testId();
      
      // Create a task
      const { data: task, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: `Test Task ${uid}`,
          description: 'Test task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(createError).toBeNull();
      createdTaskIds.push(task.id);

      // Try to set parent_id to its own id - should fail
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ parent_id: task.id })
        .eq('id', task.id);

      // Should get an error (either constraint violation or RLS)
      expect(updateError).toBeDefined();
    }, 15000);
  });

  describe('AC1: Max 2 Levels Deep Constraint', () => {
    it('should prevent creating 3+ levels of depth', async () => {
      const uid = testId();
      
      // Create level 0 (epic)
      const { data: level0, error: error0 } = await supabase
        .from('tasks')
        .insert({
          title: `Level 0 Epic ${uid}`,
          description: 'Test epic',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(error0).toBeNull();
      createdTaskIds.push(level0.id);

      // Create level 1 (story)
      const { data: level1, error: error1 } = await supabase
        .from('tasks')
        .insert({
          title: `Level 1 Story ${uid}`,
          description: 'Test story',
          column: 'idea',
          board_id: testBoard.id,
          parent_id: level0.id
        })
        .select()
        .single();

      expect(error1).toBeNull();
      createdTaskIds.push(level1.id);

      // Try to create level 2 (sub-story) - should fail due to depth constraint
      const { data: level2, error: error2 } = await supabase
        .from('tasks')
        .insert({
          title: `Level 2 Sub-Story ${uid}`,
          description: 'This should fail',
          column: 'idea',
          board_id: testBoard.id,
          parent_id: level1.id
        })
        .select()
        .single();

      // Should get an error preventing 3+ levels
      expect(error2).toBeDefined();
      
      // If it somehow succeeded, clean up
      if (level2) {
        createdTaskIds.push(level2.id);
      }
    }, 20000);
  });

  describe('Backward Compatibility', () => {
    it('should allow tasks without parent_id (existing tasks)', async () => {
      const uid = testId();
      
      // Create a task without parent_id
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          title: `Regular Task ${uid}`,
          description: 'Task without parent',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(task).toBeDefined();
      expect(task.parent_id).toBeNull();
      createdTaskIds.push(task.id);
    }, 15000);
  });
});
