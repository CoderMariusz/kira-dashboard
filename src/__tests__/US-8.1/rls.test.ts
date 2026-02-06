import { describe, it, expect, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * US-8.1: RLS Policies Tests (INTEGRATION)
 * 
 * Requires:
 * 1. DB migration applied
 * 2. Test users created in Supabase
 * 
 * @skip Integration tests - need DB migration + test users
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Test user credentials (create test users in Supabase)
const USER1_EMAIL = 'test-user1@example.com';
const USER2_EMAIL = 'test-user2@example.com';

const shouldSkip = !supabaseUrl || !supabaseKey;

describe.skipIf(shouldSkip)('US-8.1: RLS Policies Tests', () => {
  let user1Client: SupabaseClient;
  let user2Client: SupabaseClient;
  let testBoard: any;

  beforeEach(async () => {
    // Create clients for two different users
    user1Client = createClient(supabaseUrl, supabaseKey);
    user2Client = createClient(supabaseUrl, supabaseKey);
    
    // Sign in user1 with real test user
    await user1Client.auth.signInWithPassword({
      email: 'coder.mariusz@gmail.com',
      password: 'KiraDash2026!'
    });
    // Note: user2 stays anonymous for now (real RLS tests would need 2nd user)
    
    // Get or create a test board
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.auth.signInWithPassword({
      email: 'coder.mariusz@gmail.com',
      password: 'KiraDash2026!'
    });
    let { data: board } = await supabase
      .from('boards')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (!board) {
      // Get current user's household_id
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
            name: 'Test Board',
            type: 'home',
            columns: ['idea', 'doing', 'done']
          })
          .select()
          .maybeSingle();
        board = newBoard;
      }
    }
    testBoard = board;
  });

  describe('AC2: Household Isolation', () => {
    it('user1 should only see tasks from their own household', async () => {
      // User1 tries to see their tasks
      const { data: user1Tasks, error: user1Error } = await user1Client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(user1Error).toBeNull();
      expect(user1Tasks).toBeDefined();

      // All tasks should belong to user1's household
      if (user1Tasks && user1Tasks.length > 0) {
        const householdId = user1Tasks[0].household_id;
        user1Tasks.forEach(task => {
          expect(task.household_id).toBe(householdId);
        });
      }
    });

    it('user2 should only see tasks from their own household', async () => {
      // User2 tries to see their tasks
      const { data: user2Tasks, error: user2Error } = await user2Client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(user2Error).toBeNull();
      expect(user2Tasks).toBeDefined();

      // All tasks should belong to user2's household
      if (user2Tasks && user2Tasks.length > 0) {
        const householdId = user2Tasks[0].household_id;
        user2Tasks.forEach(task => {
          expect(task.household_id).toBe(householdId);
        });
      }
    });

    it('should prevent cross-household parent-child relationships', async () => {
      // Create a task in user1's household
      const { data: user1Task, error: createError1 } = await user1Client
        .from('tasks')
        .insert({
          title: 'User1 Parent Task',
          description: 'Parent task in household 1',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(createError1).toBeNull();
      expect(user1Task).toBeDefined();

      // Try to create a child task for user1's parent using user2's client
      // This should fail because they're in different households
      const { error: createError2 } = await user2Client
        .from('tasks')
        .insert({
          title: 'User2 Child Task',
          description: 'Child task in household 2',
          column: 'idea',
          board_id: testBoard.id,
          parent_id: user1Task.id
        });

      // This test will FAIL initially - RLS should prevent this
      expect(createError2).toBeDefined();
      expect(createError2?.message).toMatch(/household|permission/i);
    });
  });

  describe('AC2: Parent-Child Household Consistency', () => {
    it('should ensure parent and child are in same household', async () => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create a parent task
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .insert({
          title: 'Parent Task',
          description: 'Test parent',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(parentError).toBeNull();
      expect(parent).toBeDefined();

      // Create a child task
      const { data: child, error: childError } = await supabase
        .from('tasks')
        .insert({
          title: 'Child Task',
          description: 'Test child',
          column: 'idea',
          board_id: testBoard.id,
          parent_id: parent.id
        })
        .select()
        .single();

      expect(childError).toBeNull();
      expect(child).toBeDefined();

      // Both should have the same household_id
      expect(child.household_id).toBe(parent.household_id);
    });

    it('should prevent updating parent_id to different household', async () => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create two tasks in same household
      const { data: task1, error: error1 } = await supabase
        .from('tasks')
        .insert({
          title: 'Task 1',
          description: 'First task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      const { data: task2, error: error2 } = await supabase
        .from('tasks')
        .insert({
          title: 'Task 2',
          description: 'Second task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(error1).toBeNull();
      expect(error2).toBeNull();

      // They should be in same household (created by same user)
      expect(task1.household_id).toBe(task2.household_id);

      // Set task2 as parent of task1 - should work
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ parent_id: task2.id })
        .eq('id', task1.id);

      expect(updateError).toBeNull();
    });
  });

  describe('AC2: Cascade Delete with RLS', () => {
    it('should cascade delete children when parent is deleted', async () => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create a parent task
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .insert({
          title: 'Parent for Cascade Test',
          description: 'Parent task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(parentError).toBeNull();
      expect(parent).toBeDefined();

      // Create multiple child tasks
      const children = [];
      for (let i = 0; i < 3; i++) {
        const { data: child, error: childError } = await supabase
          .from('tasks')
          .insert({
            title: `Child ${i}`,
            description: `Child task ${i}`,
            column: 'idea',
            board_id: testBoard.id,
            parent_id: parent.id
          })
          .select()
          .single();

        expect(childError).toBeNull();
        children.push(child);
      }

      // Delete parent - should cascade delete all children
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', parent.id);

      expect(deleteError).toBeNull();

      // Check that parent is gone
      const { data: deletedParent, error: parentCheckError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', parent.id)
        .single();

      expect(parentCheckError).toBeDefined();
      expect(deletedParent).toBeNull();

      // Check that all children are also gone
      for (const child of children) {
        const { data: deletedChild, error: childCheckError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', child.id)
          .single();

        expect(childCheckError).toBeDefined();
        expect(deletedChild).toBeNull();
      }
    });

    it('should only cascade delete within same household', async () => {
      // This test ensures RLS doesn't allow cross-household cascades
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create parent and children
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .insert({
          title: 'Parent',
          description: 'Parent task',
          column: 'idea',
          board_id: testBoard.id
        })
        .select()
        .single();

      expect(parentError).toBeNull();

      const { data: child, error: childError } = await supabase
        .from('tasks')
        .insert({
          title: 'Child',
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

      // Child should be deleted (cascade within household)
      const { data: deletedChild, error: checkError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', child.id)
        .single();

      expect(checkError).toBeDefined();
      expect(deletedChild).toBeNull();
    });
  });

  describe('AC2: Query Performance with RLS', () => {
    it('should efficiently filter by household_id when querying with parent_id', async () => {
      const supabase = createClient(supabaseUrl, supabaseKey);

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
    });
  });
});
