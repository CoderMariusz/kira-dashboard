'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskWithAssignee, TaskColumn } from '@/lib/types/app';

// ═══════════════════════════════════════════════════════════
// FETCH: Tasks by board_id (z assignee join)
// ═══════════════════════════════════════════════════════════

async function fetchTasksByBoard(boardId: string): Promise<TaskWithAssignee[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!assigned_to (
        id,
        display_name,
        avatar_url
      )
    `)
    .eq('board_id', boardId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as TaskWithAssignee[];
}

// ═══════════════════════════════════════════════════════════
// FETCH: Pojedynczy task po ID (z assignee join)
// ═══════════════════════════════════════════════════════════

async function fetchTaskById(taskId: string): Promise<TaskWithAssignee | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!assigned_to (
        id,
        display_name,
        avatar_url
      )
    `)
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as TaskWithAssignee;
}

// ═══════════════════════════════════════════════════════════
// CREATE: Nowe zadanie
// ═══════════════════════════════════════════════════════════

interface CreateTaskParams {
  board_id: string;
  title: string;
  column?: TaskColumn;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  assignee_id?: string | null;
  labels?: string[];
  subtasks?: Array<{ title: string; done: boolean }>;
}

async function createTask(params: CreateTaskParams): Promise<Task> {
  const supabase = createClient();
  
  // Oblicz pozycję — max + 1000 w danej kolumnie
  const column = params.column ?? 'idea';
  
  const { data: maxPosData } = await supabase
    .from('tasks')
    .select('position')
    .eq('board_id', params.board_id)
    .eq('column', column)
    .order('position', { ascending: false })
    .limit(1)
    .single() as { data: { position: number } | null; error: unknown };

  const nextPosition = (maxPosData?.position ?? 0) + 1000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tasks')
    .insert({
      board_id: params.board_id,
      title: params.title,
      description: params.description,
      column,
      priority: params.priority,
      due_date: params.due_date,
      assigned_to: params.assignee_id,
      labels: params.labels,
      subtasks: params.subtasks,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// ═══════════════════════════════════════════════════════════
// UPDATE: Aktualizacja zadania (dowolne pola)
// ═══════════════════════════════════════════════════════════

interface UpdateTaskParams {
  id: string;
  updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;
}

async function updateTask({ id, updates }: UpdateTaskParams): Promise<Task> {
  const supabase = createClient();
  
  // Map assignee_id → assigned_to for DB column name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbUpdates: Record<string, any> = { ...updates };
  if ('assignee_id' in dbUpdates) {
    dbUpdates.assigned_to = dbUpdates.assignee_id;
    delete dbUpdates.assignee_id;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// ═══════════════════════════════════════════════════════════
// MOVE: Zmiana kolumny + pozycji (drag & drop)
// ═══════════════════════════════════════════════════════════

interface MoveTaskParams {
  id: string;
  column: TaskColumn;
  position: number;
}

async function moveTask({ id, column, position }: MoveTaskParams): Promise<Task> {
  const supabase = createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tasks')
    .update({ column, position })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// ═══════════════════════════════════════════════════════════
// DELETE: Usunięcie zadania
// ═══════════════════════════════════════════════════════════

async function deleteTask(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════

/**
 * Pobiera taski dla danego board_id
 * Klucz cache: ['tasks', boardId]
 */
export function useTasks(boardId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', boardId],
    queryFn: () => fetchTasksByBoard(boardId!),
    enabled: !!boardId,
    staleTime: 60 * 1000, // 1 minuta
  });
}

/**
 * Pobiera pojedynczy task po ID
 * Klucz cache: ['task', taskId]
 */
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTaskById(taskId!),
    enabled: !!taskId,
    staleTime: 30 * 1000, // 30 sekund
  });
}

/**
 * Mutacja: utwórz nowy task
 * Po sukcesie: invalidate cache ['tasks', boardId]
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.board_id] });
    },
  });
}

/**
 * Mutacja: aktualizuj task
 * Optimistic update — natychmiast zmienia dane w cache
 */
export function useUpdateTask(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onMutate: async ({ id, updates }) => {
      // Anuluj bieżące fetche
      await queryClient.cancelQueries({ queryKey: ['tasks', boardId] });

      // Snapshot poprzednich danych
      const previous = queryClient.getQueryData<TaskWithAssignee[]>(['tasks', boardId]);

      // Optimistic update
      if (previous) {
        queryClient.setQueryData<TaskWithAssignee[]>(
          ['tasks', boardId],
          previous.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          )
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback przy błędzie
      if (context?.previous) {
        queryClient.setQueryData(['tasks', boardId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    },
  });
}

/**
 * Mutacja: przenieś task (drag & drop)
 * Optimistic update — natychmiast zmienia kolumnę + pozycję
 */
export function useMoveTask(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: moveTask,
    onMutate: async ({ id, column, position }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', boardId] });

      const previous = queryClient.getQueryData<TaskWithAssignee[]>(['tasks', boardId]);

      if (previous) {
        queryClient.setQueryData<TaskWithAssignee[]>(
          ['tasks', boardId],
          previous.map((task) =>
            task.id === id ? { ...task, column, position } : task
          )
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', boardId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    },
  });
}

/**
 * Mutacja: usuń task
 * Optimistic delete
 */
export function useDeleteTask(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', boardId] });

      const previous = queryClient.getQueryData<TaskWithAssignee[]>(['tasks', boardId]);

      if (previous) {
        queryClient.setQueryData<TaskWithAssignee[]>(
          ['tasks', boardId],
          previous.filter((task) => task.id !== taskId)
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', boardId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    },
  });
}
