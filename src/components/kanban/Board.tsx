'use client';

import { useMemo } from 'react';
import { useBoard } from '@/lib/hooks/useBoard';
import { useTasks } from '@/lib/hooks/useTasks';
import { useTasksRealtime } from '@/lib/hooks/useRealtime';
import { useUIStore } from '@/lib/store';
import { BOARD_COLUMNS } from '@/lib/utils/constants';
import { Column } from './Column';
import { BoardSkeleton } from './BoardSkeleton';
import type { BoardType, ColumnConfig, TaskWithAssignee, TaskColumn } from '@/lib/types/app';

interface BoardProps {
  type: BoardType;
}

export function Board({ type }: BoardProps) {
  // ═══ DATA ═══
  const { data: board, isLoading: boardLoading, error: boardError } = useBoard(type);
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks(board?.id);
  const openTaskModal = useUIStore((s) => s.openTaskModal);

  // ═══ REALTIME ═══
  useTasksRealtime(board?.id);

  // ═══ COLUMN CONFIG ═══
  // Pobierz konfigurację kolumn dla tego typu boardu
  const columns = useMemo(() => {
    return [...(BOARD_COLUMNS[type] ?? BOARD_COLUMNS.home)] as ColumnConfig[];
  }, [type]);

  // ═══ TASKS PER COLUMN ═══
  // Grupuj taski po kolumnie, sortuj po position
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, TaskWithAssignee[]> = {};

    for (const col of columns) {
      grouped[col.key] = [];
    }

    if (tasks) {
      for (const task of tasks) {
        const col = task.column as TaskColumn;
        if (grouped[col]) {
          grouped[col].push(task);
        } else {
          // Task z nieznaną kolumną → wrzuć do pierwszej
          grouped[columns[0].key]?.push(task);
        }
      }

      // Sortuj każdą kolumnę po position
      for (const col of Object.keys(grouped)) {
        grouped[col].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      }
    }

    return grouped;
  }, [tasks, columns]);

  // ═══ LOADING STATE ═══
  if (boardLoading || tasksLoading) {
    return <BoardSkeleton columns={columns.length} />;
  }

  // ═══ ERROR STATE ═══
  if (boardError || tasksError) {
    const error = boardError || tasksError;
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-medium text-red-600">
          Nie udało się załadować tablicy
        </p>
        <p className="mt-1 text-xs text-red-500">
          {error instanceof Error ? error.message : 'Nieznany błąd'}
        </p>
      </div>
    );
  }

  // ═══ NO BOARD STATE ═══
  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">
          Tablica &quot;{type === 'home' ? 'Dom' : 'Praca'}&quot; nie została jeszcze utworzona.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Sprawdź seed data w Supabase.
        </p>
      </div>
    );
  }

  // ═══ RENDER ═══
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <Column
          key={col.key}
          config={col}
          tasks={tasksByColumn[col.key] ?? []}
          onTaskClick={(taskId) => openTaskModal(taskId)}
        />
      ))}
    </div>
  );
}
