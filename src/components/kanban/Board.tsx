'use client';

import { useState, useMemo, useCallback } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useBoard } from '@/lib/hooks/useBoard';
import { useTasks, useMoveTask } from '@/lib/hooks/useTasks';
import { useTasksRealtime } from '@/lib/hooks/useRealtime';
import { useUIStore } from '@/lib/store';
import { useHousehold } from '@/lib/hooks/useHousehold';
import { useLabels } from '@/lib/hooks/useLabels';
import { useFilteredTasks } from '@/lib/hooks/useFilteredTasks';
import { BOARD_COLUMNS } from '@/lib/utils/constants';
import { BOARD_LAYOUT } from '@/lib/constants/responsive';
import { Column } from './Column';
import { TaskDragOverlay } from './DragOverlay';
import { TaskModal } from './TaskModal';
import { BoardSkeleton } from './BoardSkeleton';
import { FilterSidebar } from './FilterSidebar';
import type { BoardType, ColumnConfig, TaskColumn, TaskWithAssignee } from '@/lib/types/app';
import type { FilterState } from '@/lib/types/filters';

interface BoardProps {
  type: BoardType;
}

export function Board({ type }: BoardProps) {
  // ═══ DATA ═══
  const { data: household } = useHousehold();
  const { data: board, isLoading: boardLoading, error: boardError } = useBoard(type);
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks(board?.id);
  const { data: labels = [] } = useLabels(household?.id);
  const moveTaskMutation = useMoveTask(board?.id ?? '');
  const openTaskModal = useUIStore((s) => s.openTaskModal);

  // ═══ REALTIME ═══
  useTasksRealtime(board?.id);

  // ═══ FILTER STATE ═══
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    labels: [],
    priorities: [],
    assignees: [],
    search: '',
  });

  // ═══ DRAG STATE ═══
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);

  // ═══ SENSORS ═══
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  // ═══ COLUMN CONFIG ═══
  const columns = useMemo(() => {
    return [...(BOARD_COLUMNS[type] ?? BOARD_COLUMNS.home)] as ColumnConfig[];
  }, [type]);

  // ═══ FILTERED TASKS ═══
  const tasksByColumn = useFilteredTasks(tasks, columns, filters);

  // ═══ DRAG HANDLERS ═══
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as TaskWithAssignee | undefined;
    if (task) {
      setActiveTask(task);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveTask(null);

      if (!over || !board) return;

      const activeTaskData = active.data.current?.task as TaskWithAssignee | undefined;
      if (!activeTaskData) return;

      let targetColumn: TaskColumn;
      let targetTasks: TaskWithAssignee[];

      if (over.data.current?.type === 'column') {
        targetColumn = over.data.current.column as TaskColumn;
        targetTasks = tasksByColumn[targetColumn] ?? [];
      } else if (over.data.current?.type === 'task') {
        const overTask = over.data.current.task as TaskWithAssignee;
        targetColumn = overTask.column as TaskColumn;
        targetTasks = tasksByColumn[targetColumn] ?? [];
      } else {
        return;
      }

      const sourceColumn = activeTaskData.column as TaskColumn;

      if (sourceColumn === targetColumn) {
        const oldIndex = targetTasks.findIndex((t) => t.id === active.id);
        const newIndex = targetTasks.findIndex((t) => t.id === over.id);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(targetTasks, oldIndex, newIndex);
        const newPosition = calculatePosition(reordered, newIndex);

        moveTaskMutation.mutate({
          id: activeTaskData.id,
          column: targetColumn,
          position: newPosition,
        });

        return;
      }

      let newPosition: number;

      if (over.data.current?.type === 'task') {
        const overIndex = targetTasks.findIndex((t) => t.id === over.id);
        newPosition = calculatePosition(targetTasks, overIndex);
      } else {
        const lastPos =
          targetTasks.length > 0
            ? (targetTasks[targetTasks.length - 1].position ?? 0)
            : 0;
        newPosition = lastPos + 1000;
      }

      moveTaskMutation.mutate({
        id: activeTaskData.id,
        column: targetColumn,
        position: newPosition,
      });
    },
    [board, tasksByColumn, moveTaskMutation]
  );

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

  // Get unique assignees from tasks for filter (MUST be before any early return!)
  const uniqueAssignees = useMemo(() => {
    const seen = new Set<string>();
    const assignees: { id: string; display_name: string }[] = [];
    
    for (const task of tasks ?? []) {
      if (task.assignee && !seen.has(task.assignee.id)) {
        seen.add(task.assignee.id);
        assignees.push({
          id: task.assignee.id,
          display_name: task.assignee.display_name
        });
      }
    }
    
    return assignees;
  }, [tasks]);

  // ═══ NO BOARD STATE ═══
  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">
          Tablica &quot;{type === 'home' ? 'Dom' : 'Praca'}&quot; nie została jeszcze
          utworzona.
        </p>
      </div>
    );
  }

  // ═══ RENDER ═══

  // Calculate active filter count for badge
  const activeFilterCount =
    filters.labels.length +
    filters.priorities.length +
    filters.assignees.length +
    (filters.search ? 1 : 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <>
        {/* Header with filter button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{board?.name}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen(!filterOpen)}
            aria-label="Filtry"
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtry
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <div data-testid="kanban-board" className={BOARD_LAYOUT.CONTAINER}>
          {columns.map((col) => (
            <Column
              key={col.key}
              boardId={board.id}
              config={col}
              tasks={tasksByColumn[col.key] ?? []}
              onTaskClick={(taskId) => openTaskModal(taskId)}
            />
          ))}
        </div>

        {/* Overlay — karta podążająca za kursorem */}
        <TaskDragOverlay activeTask={activeTask} />

        {/* Modal tworzenia/edycji zadania */}
        <TaskModal boardType={type} boardId={board.id} />

        {/* Filter Sidebar */}
        <FilterSidebar
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
          labels={labels}
          assignees={uniqueAssignees}
        />
      </>
    </DndContext>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPER: Oblicz nową pozycję między sąsiadami
// ═══════════════════════════════════════════════════════════

function calculatePosition(tasks: TaskWithAssignee[], targetIndex: number): number {
  if (tasks.length === 0) return 1000;

  if (targetIndex === 0) {
    return Math.floor((tasks[0].position ?? 0) / 2);
  }

  if (targetIndex >= tasks.length) {
    return (tasks[tasks.length - 1].position ?? 0) + 1000;
  }

  const before = tasks[targetIndex - 1].position ?? 0;
  const after = tasks[targetIndex].position ?? 0;
  return Math.floor((before + after) / 2);
}
