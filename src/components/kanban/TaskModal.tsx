'use client';

import { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUIStore } from '@/lib/store';
import { useCreateTask } from '@/lib/hooks/useTasks';
import { TaskForm } from './TaskForm';
import { useToast } from '@/hooks/use-toast';
import type { TaskFormValues } from '@/lib/validations/task';
import type { BoardType, TaskColumn } from '@/lib/types/app';

interface TaskModalProps {
  boardType: BoardType;
  boardId: string;
  /** Domyślna kolumna przy tworzeniu (np. kliknięto "+" w kolumnie "idea") */
  defaultColumn?: TaskColumn;
}

export function TaskModal({ boardType, boardId, defaultColumn }: TaskModalProps) {
  const { toast } = useToast();

  // ═══ ZUSTAND STATE ═══
  const taskModalOpen = useUIStore((s) => s.taskModalOpen);
  const editingTaskId = useUIStore((s) => s.editingTaskId);
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);

  // ═══ MUTATIONS ═══
  const createTask = useCreateTask();

  // ═══ MODE ═══
  // Jeśli editingTaskId jest null → tryb tworzenia
  // Jeśli editingTaskId istnieje → tryb edycji (US-2.4)
  const isCreateMode = !editingTaskId;

  // ═══ HANDLE SUBMIT — CREATE ═══
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

  // ═══ RENDER — tylko CREATE mode w tej story ═══
  // Tryb EDIT zostanie dodany w US-2.4
  if (!isCreateMode) {
    // Placeholder dla US-2.4 — na razie zamknij modal
    return null;
  }

  return (
    <Dialog open={taskModalOpen} onOpenChange={(open) => !open && closeTaskModal()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nowe zadanie</DialogTitle>
        </DialogHeader>

        <TaskForm
          boardType={boardType}
          initialValues={{
            column: defaultColumn ?? 'idea',
          }}
          isSubmitting={createTask.isPending}
          onSubmit={handleCreate}
          onCancel={closeTaskModal}
        />
      </DialogContent>
    </Dialog>
  );
}
