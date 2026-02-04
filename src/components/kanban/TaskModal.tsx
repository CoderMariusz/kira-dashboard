'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUIStore } from '@/lib/store';
import { useTask, useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/hooks/useTasks';
import { TaskForm } from './TaskForm';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import type { TaskFormValues } from '@/lib/validations/task';
import type { BoardType, TaskColumn } from '@/lib/types/app';

interface TaskModalProps {
  boardType: BoardType;
  boardId: string;
  /** Domyślna kolumna przy tworzeniu */
  defaultColumn?: TaskColumn;
}

export function TaskModal({ boardType, boardId, defaultColumn }: TaskModalProps) {
  const { toast } = useToast();

  // ═══ ZUSTAND STATE ═══
  const taskModalOpen = useUIStore((s) => s.taskModalOpen);
  const editingTaskId = useUIStore((s) => s.editingTaskId);
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);

  // ═══ MODE ═══
  const isCreateMode = !editingTaskId;
  const isEditMode = !!editingTaskId;

  // ═══ FETCH TASK (tylko w edit mode) ═══
  const { data: existingTask, isLoading: taskLoading } = useTask(
    isEditMode ? editingTaskId : null
  );

  // ═══ MUTATIONS ═══
  const createTask = useCreateTask();
  const updateTask = useUpdateTask(boardId);
  const deleteTask = useDeleteTask(boardId);

  // ═══ DELETE CONFIRM STATE ═══
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ═══ INITIAL VALUES (edit mode) ═══
  const editInitialValues = useMemo<Partial<TaskFormValues> | undefined>(() => {
    if (!existingTask) return undefined;

    return {
      title: existingTask.title,
      description: existingTask.description ?? '',
      priority: existingTask.priority as TaskFormValues['priority'],
      column: existingTask.column as TaskFormValues['column'],
      due_date: existingTask.due_date
        ? new Date(existingTask.due_date).toISOString().slice(0, 16)
        : '',
      assignee_id: existingTask.assignee_id || undefined,
      labels: (existingTask.labels ?? []) as string[],
      subtasks: (existingTask.subtasks ?? []) as Array<{ title: string; done: boolean }>,
    };
  }, [existingTask]);

  // ═══ HANDLE CREATE ═══
  const handleCreate = useCallback(
    async (values: TaskFormValues) => {
      try {
        await createTask.mutateAsync({
          board_id: boardId,
          title: values.title,
          description: values.description || undefined,
          column: (values.column as TaskColumn) ?? defaultColumn ?? 'idea',
          priority: values.priority,
          due_date: values.due_date || null,
          assignee_id: values.assignee_id || null,
          labels: values.labels,
          subtasks: values.subtasks,
        });

        toast({
          title: '✅ Zadanie utworzone',
          description: values.title,
        });

        closeTaskModal();
      } catch (error) {
        toast({
          title: '❌ Błąd',
          description:
            error instanceof Error ? error.message : 'Nie udało się utworzyć zadania',
          variant: 'destructive',
        });
      }
    },
    [boardId, defaultColumn, createTask, closeTaskModal, toast]
  );

  // ═══ HANDLE UPDATE ═══
  const handleUpdate = useCallback(
    async (values: TaskFormValues) => {
      if (!editingTaskId) return;

      try {
        await updateTask.mutateAsync({
          id: editingTaskId,
          updates: {
            title: values.title,
            description: values.description || null,
            column: values.column as TaskColumn,
            priority: values.priority,
            due_date: values.due_date || null,
            assignee_id: values.assignee_id || null,
            labels: values.labels,
            subtasks: values.subtasks,
          },
        });

        toast({
          title: '✅ Zadanie zaktualizowane',
          description: values.title,
        });

        closeTaskModal();
      } catch (error) {
        toast({
          title: '❌ Błąd',
          description:
            error instanceof Error ? error.message : 'Nie udało się zaktualizować zadania',
          variant: 'destructive',
        });
      }
    },
    [editingTaskId, updateTask, closeTaskModal, toast]
  );

  // ═══ HANDLE DELETE ═══
  const handleDelete = useCallback(async () => {
    if (!editingTaskId) return;

    try {
      await deleteTask.mutateAsync(editingTaskId);

      toast({
        title: '🗑️ Zadanie usunięte',
        description: existingTask?.title ?? 'Zadanie zostało usunięte',
      });

      setShowDeleteConfirm(false);
      closeTaskModal();
    } catch (error) {
      toast({
        title: '❌ Błąd',
        description:
          error instanceof Error ? error.message : 'Nie udało się usunąć zadania',
        variant: 'destructive',
      });
    }
  }, [editingTaskId, existingTask, deleteTask, closeTaskModal, toast]);

  // ═══ RENDER ═══
  return (
    <Dialog open={taskModalOpen} onOpenChange={(open) => !open && closeTaskModal()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode ? 'Nowe zadanie' : 'Edytuj zadanie'}
          </DialogTitle>
        </DialogHeader>

        {/* Loading state w trybie edycji */}
        {isEditMode && taskLoading && (
          <div className="space-y-4 py-4">
            <div className="h-10 animate-pulse rounded bg-gray-200" />
            <div className="h-24 animate-pulse rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 animate-pulse rounded bg-gray-200" />
              <div className="h-10 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        )}

        {/* CREATE MODE */}
        {isCreateMode && (
          <TaskForm
            boardType={boardType}
            initialValues={{ column: defaultColumn ?? 'idea' }}
            isSubmitting={createTask.isPending}
            onSubmit={handleCreate}
            onCancel={closeTaskModal}
          />
        )}

        {/* EDIT MODE — czekamy na dane taska */}
        {isEditMode && !taskLoading && editInitialValues && (
          <>
            <TaskForm
              boardType={boardType}
              initialValues={editInitialValues}
              isSubmitting={updateTask.isPending}
              onSubmit={handleUpdate}
              onCancel={closeTaskModal}
            />

            {/* Separator + przycisk usuwania */}
            <div className="border-t pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-700 hover:underline"
              >
                Usuń zadanie
              </button>
            </div>
          </>
        )}

        {/* EDIT MODE — task nie znaleziony */}
        {isEditMode && !taskLoading && !existingTask && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">Zadanie nie zostało znalezione.</p>
          </div>
        )}

        {/* Dialog potwierdzenia usunięcia */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Usunąć zadanie?"
          description={`Zadanie "${existingTask?.title ?? ''}" zostanie trwale usunięte. Tej operacji nie można cofnąć.`}
          confirmLabel="Usuń"
          isLoading={deleteTask.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
