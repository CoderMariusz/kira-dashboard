'use client';

/**
 * useEpics Hook
 * 
 * React Query hooks for Epic/Story operations.
 * Provides consistent API for CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export interface Epic {
  id: string;
  title: string;
  description?: string | null;
  type: 'epic';
  parent_id: null;
  household_id: string;
  story_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Story {
  id: string;
  title: string;
  description?: string | null;
  type: 'story';
  parent_id: string;
  household_id: string;
  completed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EpicWithStories extends Epic {
  stories: Story[];
}

export interface CreateEpicInput {
  title: string;
  description?: string;
}

export interface CreateStoryInput {
  title: string;
  description?: string;
}

export interface MoveStoryInput {
  storyId: string;
  newParentId: string;
}

// ══════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════

/**
 * Base API fetcher with error handling
 */
async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error((error as any).error || 'Request failed');
  }

  return response.json().then((data) => {
    // Extract the actual data from response wrapper
    if ((data as any).epics) return (data as any).epics;
    if ((data as any).epic) return (data as any).epic;
    if ((data as any).stories) return (data as any).stories;
    if ((data as any).story) return (data as any).story;
    return data;
  });
}

/**
 * Fetch all epics with story count
 */
async function fetchEpics(): Promise<Epic[]> {
  return apiFetch<Epic[]>('/api/epics');
}

/**
 * Fetch single epic with stories
 */
async function fetchEpic(id: string): Promise<EpicWithStories> {
  return apiFetch<EpicWithStories>(`/api/epics/${id}`);
}

/**
 * Create a new epic
 */
async function createEpic(input: CreateEpicInput): Promise<Epic> {
  return apiFetch<{ epic: Epic }>('/api/epics', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((res) => res.epic);
}

/**
 * Create a new story under an epic
 */
async function createStory(epicId: string, input: CreateStoryInput): Promise<Story> {
  return apiFetch<{ story: Story }>(`/api/epics/${epicId}/stories`, {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((res) => res.story);
}

/**
 * Move story to different epic
 */
async function moveStory(input: MoveStoryInput): Promise<Story> {
  return apiFetch<{ story: Story }>(`/api/tasks/${input.storyId}/parent`, {
    method: 'PUT',
    body: JSON.stringify({ parent_id: input.newParentId }),
  }).then((res) => res.story);
}

/**
 * Delete an epic (cascade deletes stories)
 */
async function deleteEpic(id: string): Promise<void> {
  return apiFetch<{ success: boolean }>(`/api/epics/${id}`, {
    method: 'DELETE',
  }).then(() => undefined);
}

// ══════════════════════════════════════════════════════════
// QUERY KEYS
// ══════════════════════════════════════════════════════════

const queryKeys = {
  allEpics: ['epics'] as const,
  epic: (id: string) => ['epics', id] as const,
  stories: (epicId: string) => ['epics', epicId, 'stories'] as const,
};

// ══════════════════════════════════════════════════════════
// QUERY HOOKS
// ══════════════════════════════════════════════════════════

/**
 * useEpics - Fetch list of all epics
 * 
 * @example
 * const { data, isLoading, error } = useEpics();
 */
export function useEpics() {
  return useQuery({
    queryKey: queryKeys.allEpics,
    queryFn: fetchEpics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * useEpic - Fetch single epic with nested stories
 * 
 * @param id - Epic ID
 * @example
 * const { data, isLoading, error } = useEpic('epic-1');
 */
export function useEpic(id: string) {
  return useQuery({
    queryKey: queryKeys.epic(id),
    queryFn: () => fetchEpic(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ══════════════════════════════════════════════════════════
// MUTATION HOOKS
// ══════════════════════════════════════════════════════════

/**
 * useCreateEpic - Create a new epic
 * 
 * @example
 * const { mutate, isPending, isError } = useCreateEpic();
 * mutate({ title: 'New Epic' });
 */
export function useCreateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEpicInput) => createEpic(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allEpics });
    },
  });
}

/**
 * useCreateStory - Create a new story under an epic
 * 
 * @param epicId - Parent epic ID
 * @example
 * const { mutate, isPending } = useCreateStory('epic-1');
 * mutate({ title: 'New Story' });
 */
export function useCreateStory(epicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStoryInput) => createStory(epicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.epic(epicId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allEpics });
    },
  });
}

/**
 * useMoveStory - Move story to different epic
 * 
 * @example
 * const { mutate } = useMoveStory();
 * mutate({ storyId: 'story-1', newParentId: 'epic-2' });
 */
export function useMoveStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MoveStoryInput) => moveStory(input),
    onSuccess: (updatedStory: Story) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allEpics });
      const oldParentId = updatedStory.parent_id;
      queryClient.invalidateQueries({ queryKey: queryKeys.epic(oldParentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.epic(updatedStory.parent_id) });
    },
  });
}

/**
 * useDeleteEpic - Delete an epic (cascade deletes stories)
 * 
 * @example
 * const { mutate } = useDeleteEpic();
 * mutate('epic-1');
 */
export function useDeleteEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEpic(id),
    onSuccess: (_, epicId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allEpics });
      queryClient.removeQueries({ queryKey: queryKeys.epic(epicId) });
    },
  });
}
