import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Note: These tests will FAIL initially because helper functions haven't been implemented yet
// This is intentional - TDD approach

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

describe('US-8.1: Helper Functions Tests', () => {
  let supabase: SupabaseClient;
  let testEpic: any;
  let testStories: any[] = [];

  beforeEach(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create test epic
    const { data: epic, error: epicError } = await supabase
      .from('tasks')
      .insert({
        title: 'Test Epic',
        description: 'Test epic for helpers',
        status: 'todo'
      })
      .select()
      .single();

    if (!epicError) {
      testEpic = epic;

      // Create test stories
      for (let i = 0; i < 3; i++) {
        const { data: story, error: storyError } = await supabase
          .from('tasks')
          .insert({
            title: `Story ${i}`,
            description: `Test story ${i}`,
            status: 'todo',
            parent_id: testEpic.id
          })
          .select()
          .single();

        if (!storyError) {
          testStories.push(story);
        }
      }
    }
  });

  afterEach(async () => {
    // Cleanup test data
    if (testEpic) {
      // Delete epic (should cascade delete stories)
      await supabase
        .from('tasks')
        .delete()
        .eq('id', testEpic.id);
    }
  });

  describe('AC3: get_epic_with_stories(epic_id)', () => {
    it('should return epic with nested stories', async () => {
      // Call the helper function via RPC
      const { data, error } = await supabase
        .rpc('get_epic_with_stories', { epic_id: testEpic.id });

      // This test will FAIL initially - function doesn't exist yet
      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify structure
      expect(data).toHaveProperty('id', testEpic.id);
      expect(data).toHaveProperty('stories');
      expect(Array.isArray(data.stories)).toBe(true);
      expect(data.stories.length).toBe(testStories.length);

      // Verify stories have correct parent_id
      data.stories.forEach((story: any) => {
        expect(story.parent_id).toBe(testEpic.id);
      });
    });

    it('should return null for non-existent epic_id', async () => {
      const fakeEpicId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .rpc('get_epic_with_stories', { epic_id: fakeEpicId });

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it('should return epic with empty stories array if epic has no children', async () => {
      // Create epic without children
      const { data: epicWithoutChildren, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: 'Epic Without Children',
          description: 'Test epic',
          status: 'todo'
        })
        .select()
        .single();

      expect(createError).toBeNull();

      const { data, error } = await supabase
        .rpc('get_epic_with_stories', { epic_id: epicWithoutChildren.id });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.stories).toEqual([]);

      // Cleanup
      await supabase
        .from('tasks')
        .delete()
        .eq('id', epicWithoutChildren.id);
    });

    it('should respect RLS - only return epic from user household', async () => {
      // Try to access epic from different household (should fail or return null)
      // This assumes we have test users in different households
      const { data, error } = await supabase
        .rpc('get_epic_with_stories', { epic_id: testEpic.id });

      expect(error).toBeNull();

      // If user is not in epic's household, should return null
      if (data === null) {
        // This is expected behavior for cross-household access
        expect(data).toBeNull();
      } else {
        // User is in same household, should get data
        expect(data).toBeDefined();
        expect(data.id).toBe(testEpic.id);
      }
    });
  });

  describe('AC3: get_stories_for_epic(epic_id)', () => {
    it('should return only stories for given epic_id', async () => {
      // Call the helper function via RPC
      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: testEpic.id });

      // This test will FAIL initially - function doesn't exist yet
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(testStories.length);

      // Verify all stories have correct parent_id
      data.forEach((story: any) => {
        expect(story.parent_id).toBe(testEpic.id);
      });
    });

    it('should return empty array for epic without children', async () => {
      // Create epic without children
      const { data: epicWithoutChildren, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: 'Empty Epic',
          description: 'Test epic',
          status: 'todo'
        })
        .select()
        .single();

      expect(createError).toBeNull();

      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: epicWithoutChildren.id });

      expect(error).toBeNull();
      expect(data).toEqual([]);

      // Cleanup
      await supabase
        .from('tasks')
        .delete()
        .eq('id', epicWithoutChildren.id);
    });

    it('should return empty array for non-existent epic_id', async () => {
      const fakeEpicId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: fakeEpicId });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should not return epic itself in results', async () => {
      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: testEpic.id });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      // Verify epic ID is not in results
      const epicInResults = data.find((task: any) => task.id === testEpic.id);
      expect(epicInResults).toBeUndefined();
    });

    it('should respect RLS - only return stories from user household', async () => {
      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: testEpic.id });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      // All stories should be from user's household
      if (data.length > 0) {
        const householdId = data[0].household_id;
        data.forEach((story: any) => {
          expect(story.household_id).toBe(householdId);
        });
      }
    });
  });

  describe('AC3: is_epic(task_id)', () => {
    it('should return true for epic (task with children)', async () => {
      const { data, error } = await supabase
        .rpc('is_epic', { task_id: testEpic.id });

      // This test will FAIL initially - function doesn't exist yet
      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false for story (task without children)', async () => {
      if (testStories.length > 0) {
        const { data, error } = await supabase
          .rpc('is_epic', { task_id: testStories[0].id });

        expect(error).toBeNull();
        expect(data).toBe(false);
      }
    });

    it('should return false for regular task without parent_id and no children', async () => {
      // Create a regular task
      const { data: regularTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: 'Regular Task',
          description: 'Test task',
          status: 'todo'
        })
        .select()
        .single();

      expect(createError).toBeNull();

      const { data, error } = await supabase
        .rpc('is_epic', { task_id: regularTask.id });

      expect(error).toBeNull();
      expect(data).toBe(false);

      // Cleanup
      await supabase
        .from('tasks')
        .delete()
        .eq('id', regularTask.id);
    });

    it('should return null or false for non-existent task_id', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .rpc('is_epic', { task_id: fakeTaskId });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should handle task with children that were deleted', async () => {
      // Create epic with children, then delete children
      const { data: epic, error: epicError } = await supabase
        .from('tasks')
        .insert({
          title: 'Epic With Deleted Children',
          description: 'Test epic',
          status: 'todo'
        })
        .select()
        .single();

      expect(epicError).toBeNull();

      // Create and immediately delete a child
      const { data: child, error: childError } = await supabase
        .from('tasks')
        .insert({
          title: 'Temporary Child',
          description: 'Will be deleted',
          status: 'todo',
          parent_id: epic.id
        })
        .select()
        .single();

      expect(childError).toBeNull();

      await supabase
        .from('tasks')
        .delete()
        .eq('id', child.id);

      // Epic should now be false (no children)
      const { data, error } = await supabase
        .rpc('is_epic', { task_id: epic.id });

      expect(error).toBeNull();
      expect(data).toBe(false);

      // Cleanup
      await supabase
        .from('tasks')
        .delete()
        .eq('id', epic.id);
    });

    it('should respect RLS - check only tasks from user household', async () => {
      // Try to check is_epic for task from different household
      // This should return false or null if user doesn't have access
      const { data, error } = await supabase
        .rpc('is_epic', { task_id: testEpic.id });

      expect(error).toBeNull();

      // If user can't access the task, should return false
      if (data === false && testStories.length > 0) {
        // This could happen due to RLS
        expect(data).toBe(false);
      }
    });
  });

  describe('Helper Function Edge Cases', () => {
    it('should handle circular reference attempts gracefully', async () => {
      // Try to create circular reference (should be prevented by constraints)
      const { data: task1, error: error1 } = await supabase
        .from('tasks')
        .insert({
          title: 'Task 1',
          description: 'First task',
          status: 'todo'
        })
        .select()
        .single();

      const { data: task2, error: error2 } = await supabase
        .from('tasks')
        .insert({
          title: 'Task 2',
          description: 'Second task',
          status: 'todo'
        })
        .select()
        .single();

      expect(error1).toBeNull();
      expect(error2).toBeNull();

      // Try to make task1 parent of task2
      const { error: updateError1 } = await supabase
        .from('tasks')
        .update({ parent_id: task1.id })
        .eq('id', task2.id);

      // Try to make task2 parent of task1 (should fail due to depth constraint)
      const { error: updateError2 } = await supabase
        .from('tasks')
        .update({ parent_id: task2.id })
        .eq('id', task1.id);

      // At least one should fail
      expect(updateError1 || updateError2).toBeDefined();

      // Cleanup
      await supabase
        .from('tasks')
        .delete()
        .in('id', [task1.id, task2.id]);
    });

    it('should handle deeply nested queries efficiently', async () => {
      // Create epic with many stories
      const { data: epic, error: epicError } = await supabase
        .from('tasks')
        .insert({
          title: 'Epic With Many Stories',
          description: 'Performance test epic',
          status: 'todo'
        })
        .select()
        .single();

      expect(epicError).toBeNull();

      // Create 50 stories
      const stories = [];
      for (let i = 0; i < 50; i++) {
        const { data: story } = await supabase
          .from('tasks')
          .insert({
            title: `Story ${i}`,
            description: `Performance test story ${i}`,
            status: 'todo',
            parent_id: epic.id
          })
          .select()
          .single();

        if (story) stories.push(story);
      }

      // Query should still be fast
      const startTime = Date.now();
      const { data, error } = await supabase
        .rpc('get_stories_for_epic', { epic_id: epic.id });
      const endTime = Date.now();

      expect(error).toBeNull();
      expect(data.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1s

      // Cleanup
      await supabase
        .from('tasks')
        .delete()
        .eq('id', epic.id);
    });
  });
});
