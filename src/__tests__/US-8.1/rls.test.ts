import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * US-8.1: RLS Policies Tests (INTEGRATION)
 * 
 * Requires:
 * 1. DB migration applied
 * 2. Test users created in Supabase
 * 
 * Note: Tests requiring 2 separate users are skipped (need test infrastructure)
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

describe.skipIf(shouldSkip)('US-8.1: RLS Policies Tests', () => {
  // Single authenticated client for all tests
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
            type: 'home',
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

  describe('AC2: Household Isolation', () => {
    it('user should only see tasks from their own household', async () => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(tasks).toBeDefined();

      // All tasks should belong to user's household
      if (tasks && tasks.length > 0) {
        const householdId = tasks[0].household_id;
        tasks.forEach(task => {
          expect(task.household_id).toBe(householdId);
        });
      }
    }, 10000);

    // SKIPPED: Requires a second user in a different household
    it.skip('user2 should only see tasks from their own household (needs 2nd user)', async () => {
      // This test requires a second test user in a different household
      // Currently we only have one test user
    });

    // SKIPPED: Requires a second user to test cross-household access
    it.skip('should prevent cross-household parent-child relationships (needs 2nd user)', async () => {
      // This test requires two users in different households
      // to properly test cross-household RLS enforcement
    });
  });

  describe('AC2: Parent-Child Household Consistency', () => {
    it('should ensure parent and child are in same household', async () => {
      const uid = testId();
      
      // Create a parent task
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .insert({
          title: `Parent Task ${uid}`,
          description: 'Test parent',
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
          title: `Child Task ${uid}`,
          description: 'Test child',
          column: 'idea',
          board_id: testBoard.id,
          parent_id: parent.id
        })
        .select()
        .single();

      expect(childError).toBeNull();
      expect(child).toBeDefined();
      createdTaskIds.push(child.id);

      // Both should have the same household_id
      expect(child.household_id).toBe(parent.household_id);
    }, 15000);

    it('should allow updating parent_id within same household', async () => {
      const uid = testId();
      
      // Create two tasks in same household
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

      // They should be in same household (created by same user)
      expect(task1.household_id).toBe(task2.household_id);

      // Set task2 as parent of task1 - should work
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ parent_id: task2.id })
        .eq('id', task1.id);

      expect(updateError).toBeNull();
    }, 15000);
  });

  describe('AC2: Cascade Delete with RLS', () => {
    it('should cascade delete children when parent is deleted', async () => {
      const uid = testId();
      
      // Create a parent task
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .insert({
          title: `Parent for Cascade Test ${uid}`,
          description: 'Parent task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(parentError).toBeNull();
      expect(parent).toBeDefined();
      createdTaskIds.push(parent.id);

      // Create multiple child tasks
      const childIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const { data: child, error: childError } = await supabase
          .from('tasks')
          .insert({
            title: `Child ${i} ${uid}`,
            description: `Child task ${i}`,
            column: 'idea',
            board_id: testBoard.id,
            parent_id: parent.id
          })
          .select()
          .single();

        expect(childError).toBeNull();
        childIds.push(child.id);
      }

      // Delete parent - should cascade delete all children
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', parent.id);

      expect(deleteError).toBeNull();
      createdTaskIds = createdTaskIds.filter(id => id !== parent.id);

      // Check that parent is gone
      const { data: deletedParent } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', parent.id)
        .maybeSingle();

      expect(deletedParent).toBeNull();

      // Check that all children are also gone
      for (const childId of childIds) {
        const { data: deletedChild } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', childId)
          .maybeSingle();

        expect(deletedChild).toBeNull();
      }
    }, 25000);

    it('should cascade delete within same household correctly', async () => {
      const uid = testId();
      
      // Create parent and child
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .insert({
          title: `Parent ${uid}`,
          description: 'Parent task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(parentError).toBeNull();
      createdTaskIds.push(parent.id);

      const { data: child, error: childError } = await supabase
        .from('tasks')
        .insert({
          title: `Child ${uid}`,
          description: 'Child task',
          column: 'idea',
          board_id: testBoard.id,
          parent_id: parent.id
        })
        .select()
        .single();

      expect(childError).toBeNull();

      // Verify household consistency
      expect(child.household_id).toBe(parent.household_id);

      // Delete parent
      await supabase
        .from('tasks')
        .delete()
        .eq('id', parent.id);
      
      createdTaskIds = createdTaskIds.filter(id => id !== parent.id);

      // Child should be deleted (cascade within household)
      const { data: deletedChild } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', child.id)
        .maybeSingle();

      expect(deletedChild).toBeNull();
    }, 20000);
  });

  describe('AC2: Query Performance with RLS', () => {
    it('should efficiently filter by household_id when querying with parent_id', async () => {
      // Query tasks with parent filter - RLS should apply efficiently
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      expect(error).toBeNull();
      expect(tasks).toBeDefined();

      // All returned tasks should be from user's household
      if (tasks && tasks.length > 0) {
        const householdId = tasks[0].household_id;
        tasks.forEach(task => {
          expect(task.household_id).toBe(householdId);
        });
      }
    }, 10000);
  });
});
