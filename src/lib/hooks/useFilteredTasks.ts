import { useMemo } from 'react';
import type { TaskWithAssignee } from '@/lib/types/app';
import type { FilterState } from '@/lib/types/filters';
import type { ColumnConfig } from '@/lib/types/app';

// Constants for pagination optimization
const FILTER_CACHE_DEBOUNCE_MS = 300;

/**
 * Cache compiled filter predicates to avoid recompilation
 * This is a simple optimization to avoid recreating filter functions on every render
 */
interface CompiledFilter {
  searchLower: string;
  labelIds: Set<string>;
  prioritySet: Set<string>;
  assigneeSet: Set<string>;
  hasSearch: boolean;
  hasLabels: boolean;
  hasPriorities: boolean;
  hasAssignees: boolean;
}

function compileFilter(filters: FilterState): CompiledFilter {
  return {
    searchLower: filters.search.toLowerCase(),
    labelIds: new Set(filters.labels),
    prioritySet: new Set(filters.priorities),
    assigneeSet: new Set(filters.assignees),
    hasSearch: !!filters.search,
    hasLabels: filters.labels.length > 0,
    hasPriorities: filters.priorities.length > 0,
    hasAssignees: filters.assignees.length > 0,
  };
}

/**
 * Filter tasks based on the provided filter state
 * Optimized with compiled filter criteria for faster matching
 */
function applyFilters(tasks: TaskWithAssignee[], compiled: CompiledFilter): TaskWithAssignee[] {
  return tasks.filter((task) => {
    // Search filter - early exit if doesn't match
    if (compiled.hasSearch && !task.title.toLowerCase().includes(compiled.searchLower)) {
      return false;
    }

    // Labels filter - AND condition with OR within labels
    if (compiled.hasLabels) {
      const taskLabelIds = (task as any).labels?.map((l: any) => l.id) ?? [];
      const hasLabel = taskLabelIds.some((labelId: string) => compiled.labelIds.has(labelId));
      if (!hasLabel) return false;
    }

    // Priority filter - AND condition
    if (compiled.hasPriorities && !compiled.prioritySet.has(task.priority)) {
      return false;
    }

    // Assignee filter - AND condition
    if (compiled.hasAssignees && !compiled.assigneeSet.has(task.assignee_id ?? '')) {
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
 * Optimized with compiled filters for O(n) complexity
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
    if (!tasks) {
      // Return empty column structure if no tasks
      const empty: Record<string, TaskWithAssignee[]> = {};
      for (const col of columns) {
        empty[col.key] = [];
      }
      return empty;
    }

    // Compile filters once for better performance
    const compiled = compileFilter(filters);
    
    // Apply filters with compiled criteria (O(n) complexity)
    const filtered = applyFilters(tasks, compiled);
    
    // Group by column and sort
    return groupTasksByColumn(filtered, columns);
  }, [tasks, columns, filters]);
}
