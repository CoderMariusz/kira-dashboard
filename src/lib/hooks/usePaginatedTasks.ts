import { useState, useCallback, useMemo } from 'react';
import type { TaskWithAssignee } from '@/lib/types/app';

interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  totalItems: number;
}

/**
 * Hook for paginating filtered tasks
 * Useful for avoiding performance issues when rendering large task lists
 * 
 * @param tasks - Array of tasks to paginate
 * @param options - Pagination options (pageSize, initialPage)
 * @returns Paginated tasks and pagination state/controls
 */
export function usePaginatedTasks(
  tasks: TaskWithAssignee[] | undefined,
  options: PaginationOptions = {}
) {
  const { pageSize = 50, initialPage = 0 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const pagination = useMemo(() => {
    const total = tasks?.length ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    const page = Math.min(currentPage, Math.max(0, totalPages - 1));

    return {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages - 1,
      totalItems: total,
    };
  }, [tasks, pageSize, currentPage]);

  const paginatedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    const start = pagination.currentPage * pageSize;
    const end = start + pageSize;
    return tasks.slice(start, end);
  }, [tasks, pagination.currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, page));
  }, []);

  const goToNextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [pagination.hasNextPage]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(0);
  }, []);

  return {
    tasks: paginatedTasks,
    pagination,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    reset,
  };
}
