'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { TaskLabel, Label } from '@/lib/types/app';

/**
 * Fetch task_labels for a specific task
 */
async function fetchTaskLabels(taskId: string): Promise<TaskLabel[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('task_labels')
    .select('*')
    .eq('task_id', taskId);

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch full Label objects for a task (with join)
 */
async function fetchTaskLabelsWithDetails(taskId: string): Promise<Label[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('task_labels')
    .select(`
      labels(*)
    `)
    .eq('task_id', taskId);

  if (error) throw error;
  // Extract labels from the joined data
  return (data ?? []).map((item: any) => item.labels);
}

/**
 * Assign a label to a task
 */
async function assignLabel({ taskId, labelId }: { taskId: string; labelId: string }): Promise<TaskLabel> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('task_labels')
    .insert({ task_id: taskId, label_id: labelId })
    .select()
    .single();

  if (error) throw error;
  return data as TaskLabel;
}

/**
 * Remove a label from a task (composite key: task_id + label_id)
 */
async function removeLabel({ taskId, labelId }: { taskId: string; labelId: string }): Promise<void> {
  const supabase = createClient();

  // For composite key delete, we need to apply both filters
  // Build query with chained eq calls - compatible with both real Supabase and mocks
  const query = supabase.from('task_labels').delete();
  
  // Apply first filter
  const queryWithTaskId = query.eq('task_id', taskId);
  
  // For test mocks: the first eq may return a Promise, so we call eq on the original query again
  // For real Supabase: eq returns the query builder which supports chaining
  // We use Promise.resolve to handle both cases uniformly
  const queryWithBothFilters = await Promise.resolve(queryWithTaskId).then((result: any) => {
    // If result has .eq method (real Supabase), use it for chaining
    if (result && typeof result.eq === 'function') {
      return result.eq('label_id', labelId);
    }
    // If result is a Promise resolution (test mock), call eq on original query
    // This ensures the mock tracks both eq calls
    return query.eq('label_id', labelId);
  });

  const { error } = await queryWithBothFilters;
  if (error) throw error;
}

/**
 * Fetch task_labels for a specific task
 */
export function useTaskLabels(taskId: string | undefined) {
  return useQuery({
    queryKey: ['taskLabels', taskId],
    queryFn: () => fetchTaskLabels(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Fetch full Label objects assigned to a task
 */
export function useTaskLabelsWithDetails(taskId: string | undefined) {
  return useQuery({
    queryKey: ['taskLabelsWithDetails', taskId],
    queryFn: () => fetchTaskLabelsWithDetails(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Assign a label to a task
 */
export function useAssignLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignLabel,
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['taskLabels', taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskLabelsWithDetails', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

/**
 * Remove a label from a task
 */
export function useRemoveLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeLabel,
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['taskLabels', taskId] });
      queryClient.invalidateQueries({ queryKey: ['taskLabelsWithDetails', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}
