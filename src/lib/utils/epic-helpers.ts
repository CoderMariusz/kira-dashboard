/**
 * Epic-related utility functions
 * Shared logic extracted from components
 */

/**
 * Status definitions for stories/epics
 */
export const STORY_STATUSES = {
  IDEA: 'idea',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
} as const;

export type StoryStatus = typeof STORY_STATUSES[keyof typeof STORY_STATUSES];

/**
 * Status styling configuration
 */
export const STATUS_STYLES = {
  [STORY_STATUSES.IDEA]: {
    color: '#64748b',
    bgClass: 'bg-slate-500',
    label: 'Idea',
    class: 'status-idea',
  },
  [STORY_STATUSES.IN_PROGRESS]: {
    color: '#f59e0b',
    bgClass: 'bg-amber-500',
    label: 'In Progress',
    class: 'status-in-progress',
  },
  [STORY_STATUSES.DONE]: {
    color: '#22c55e',
    bgClass: 'bg-green-500',
    label: 'Done',
    class: 'status-done',
  },
} as const;

/**
 * Calculate progress statistics for an epic
 */
export function calculateEpicProgress(stories: Array<{ status: string }>) {
  const totalCount = stories.length;
  const doneCount = stories.filter((s) => s.status === STORY_STATUSES.DONE).length;
  const progressPercentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return {
    totalCount,
    doneCount,
    progressPercentage,
    storyCountText: totalCount === 1 ? '1 story' : `${totalCount} stories`,
  };
}

/**
 * Get status configuration for a given status
 */
export function getStatusConfig(status: string) {
  return STATUS_STYLES[status as StoryStatus] || STATUS_STYLES[STORY_STATUSES.IDEA];
}

/**
 * Sort stories by status order
 */
export function sortStoriesByStatus<T extends { status: string }>(stories: T[]): T[] {
  const statusOrder = {
    [STORY_STATUSES.IDEA]: 0,
    [STORY_STATUSES.IN_PROGRESS]: 1,
    [STORY_STATUSES.DONE]: 2,
  };

  return [...stories].sort(
    (a, b) => (statusOrder[a.status as StoryStatus] ?? 999) - (statusOrder[b.status as StoryStatus] ?? 999)
  );
}
