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
 * Group tasks by column and optionally sort by position
 * If tasks are already sorted, we preserve that order within columns
 */
function groupTasksByColumn(
  filteredTasks: TaskWithAssignee[],
  columns: ColumnConfig[],
  preserveOrder: boolean = false
): Record<string, TaskWithAssignee[]> {
  const grouped: Record<string, TaskWithAssignee[]> = {};

  // Initialize empty arrays for all columns
  for (const col of columns) {
    grouped[col.key] = [];
  }

  // Group tasks by column (preserving order if already sorted)
  for (const task of filteredTasks) {
    const col = task.column as string;
    if (grouped[col]) {
      grouped[col].push(task);
    } else {
      // Fallback to first column if task's column doesn't exist
      grouped[columns[0].key]?.push(task);
    }
  }

  // Sort tasks within each column by position only if not preserving custom sort order
  if (!preserveOrder) {
    for (const col of Object.keys(grouped)) {
      grouped[col].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
  }

  return grouped;
}

/**
 * Enhanced task sorting - supports multiple sort fields
 */
interface SortConfig {
  field?: 'position' | 'priority' | 'due_date' | 'title' | 'created_at';
  order?: 'asc' | 'desc';
}

function applyTaskSort(tasks: TaskWithAssignee[], sort?: SortConfig): TaskWithAssignee[] {
  if (!sort?.field) return tasks;

  const priorityOrder: Record<string, number> = {
    'urgent': 0,
    'high': 1,
    'medium': 2,
    'low': 3,
  };

  return [...tasks].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sort.field) {
      case 'priority':
        aVal = priorityOrder[a.priority] ?? 999;
        bVal = priorityOrder[b.priority] ?? 999;
        break;
      case 'due_date':
        aVal = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        bVal = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        break;
      case 'title':
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case 'created_at':
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        break;
      case 'position':
      default:
        aVal = a.position ?? 0;
        bVal = b.position ?? 0;
    }

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sort.order === 'desc' ? -comparison : comparison;
  });
}

/**
 * Hook to filter and group tasks by column
 * Optimized with compiled filters for O(n) complexity
 * @param tasks - All tasks to filter
 * @param columns - Column configuration
 * @param filters - Filter state to apply
 * @param sort - Sort configuration
 * @returns Object mapping column keys to sorted task arrays
 */
export function useFilteredTasks(
  tasks: TaskWithAssignee[] | undefined,
  columns: ColumnConfig[],
  filters: FilterState,
  sort?: SortConfig
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
    
    // Apply custom sort if provided (otherwise uses position field)
    const sorted = sort ? applyTaskSort(filtered, sort) : filtered;
    
    // Group by column and maintain sort order (preserve order if custom sort applied)
    return groupTasksByColumn(sorted, columns, !!sort);
  }, [tasks, columns, filters, sort]);
}
