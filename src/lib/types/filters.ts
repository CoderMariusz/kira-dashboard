/**
 * Filter state for task filtering
 */
export interface FilterState {
  /** Selected label IDs */
  labels: string[];
  /** Selected priority levels */
  priorities: string[];
  /** Selected assignee IDs */
  assignees: string[];
  /** Search query for task titles */
  search: string;
}
