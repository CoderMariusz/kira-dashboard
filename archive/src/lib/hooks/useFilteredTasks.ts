import { useMemo } from 'react';
import type { TaskWithAssignee } from '@/lib/types/app';
import type { FilterState } from '@/lib/types/filters';
import type { ColumnConfig } from '@/lib/types/app';

/**
 * Filter tasks based on the provided filter state
 */
function applyFilters(tasks: TaskWithAssignee[], filters: FilterState): TaskWithAssignee[] {
  return tasks.filter((task) => {
    // Search filter
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Labels filter
    if (filters.labels.length > 0) {
      const taskLabelIds = (task as any).labels?.map((l: any) => l.id) ?? [];
      const hasLabel = filters.labels.some((l) => taskLabelIds.includes(l));
      if (!hasLabel) return false;
    }

    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
      return false;
    }

    // Assignee filter
    if (filters.assignees.length > 0 && !filters.assignees.includes(task.assignee_id ?? '')) {
      return false;
    }

    return true;
  });
}

/**
 * Group tasks by column and sort by position
 */
function groupTasksByColumn(
  filteredTasks: TaskWithAssignee[],
  columns: ColumnConfig[]
): Record<string, TaskWithAssignee[]> {
  const grouped: Record<string, TaskWithAssignee[]> = {};

  // Initialize empty arrays for all columns
  for (const col of columns) {
    grouped[col.key] = [];
  }

  // Group tasks by column
  for (const task of filteredTasks) {
    const col = task.column as string;
    if (grouped[col]) {
      grouped[col].push(task);
    } else {
      // Fallback to first column if task's column doesn't exist
      grouped[columns[0].key]?.push(task);
    }
  }

  // Sort tasks within each column by position
  for (const col of Object.keys(grouped)) {
    grouped[col].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  return grouped;
}

/**
 * Hook to filter and group tasks by column
 * @param tasks - All tasks to filter
 * @param columns - Column configuration
 * @param filters - Filter state to apply
 * @returns Object mapping column keys to sorted task arrays
 */
export function useFilteredTasks(
  tasks: TaskWithAssignee[] | undefined,
  columns: ColumnConfig[],
  filters: FilterState
): Record<string, TaskWithAssignee[]> {
  return useMemo(() => {
    const filtered = tasks ? applyFilters(tasks, filters) : [];
    return groupTasksByColumn(filtered, columns);
  }, [tasks, columns, filters]);
}
