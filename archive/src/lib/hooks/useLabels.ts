'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Label } from '@/lib/types/app';

/**
 * Fetch all labels for a household
 */
async function fetchLabels(householdId: string): Promise<Label[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('household_id', householdId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Create a new label
 */
async function createLabel(params: { household_id: string; name: string; color: string }): Promise<Label> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('labels')
    .insert(params)
    .select()
    .single();

  if (error) throw error;
  return data as Label;
}

/**
 * Update an existing label
 */
async function updateLabel({ id, name, color }: { id: string; name: string; color: string }): Promise<Label> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('labels')
    .update({ name, color })
    .eq('id', id) as unknown as { data: Label; error: Error | null };

  if (error) throw error;
  return data;
}

/**
 * Delete a label
 */
async function deleteLabel(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetch all labels for a household
 */
export function useLabels(householdId: string | undefined) {
  return useQuery({
    queryKey: ['labels', householdId],
    queryFn: () => fetchLabels(householdId!),
    enabled: !!householdId,
  });
}

/**
 * Create a new label
 */
export function useCreateLabel(householdId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { name: string; color: string }) =>
      createLabel({ household_id: householdId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', householdId] });
    },
  });
}

/**
 * Update an existing label
 */
export function useUpdateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLabel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['labels', data.household_id] });
    },
  });
}

/**
 * Delete a label
 */
export function useDeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => {
      // Invalidate all label queries since we don't know household_id
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
  });
}
