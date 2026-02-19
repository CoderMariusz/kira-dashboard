/**
 * Shared TypeScript types for Epic/Story features
 * Centralizes type definitions to ensure consistency
 */

import { StoryStatus } from '@/lib/utils/epic-helpers';

/**
 * Base Story interface
 */
export interface Story {
  id: string;
  title: string;
  description?: string;
  status: StoryStatus;
}

/**
 * Base Epic interface
 */
export interface Epic {
  id: string;
  title: string;
  description?: string;
  stories: Story[];
}

/**
 * Standalone task (not part of an epic)
 */
export interface StandaloneTask {
  id: string;
  title: string;
  status: StoryStatus;
  epicId: null;
}

/**
 * Input for creating an epic
 */
export interface CreateEpicInput {
  title: string;
  description: string;
}

/**
 * Input for adding a story
 */
export interface AddStoryInput {
  title: string;
  acceptanceCriteria: string[];
  epicId: string;
}

/**
 * Epic summary for dropdowns/selectors
 */
export interface EpicSummary {
  id: string;
  title: string;
  description: string;
}

/**
 * View mode for epic board
 */
export type ViewMode = 'grouped' | 'flat';

/**
 * Viewport type for responsive behavior
 */
export type Viewport = 'desktop' | 'mobile';
