// types/story.types.ts
// Typy dla widoku Story Detail (/story/[id]).
// Implementacja STORY-2.6.

export type StoryStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'REFACTOR'
  | 'DONE'
  | 'FAILED'
  | 'BLOCKED'

export type StoryPriority = 'must' | 'should' | 'could'

export interface StoryRun {
  id: string
  step: string
  model: string
  status: 'success' | 'failure' | 'in_progress'
  duration: number
  startedAt: string
  branch?: string
  notes?: string
}

export interface StoryLesson {
  id: string
  extractedAt: string
  extractedBy: string
  text: string
  tags: string[]
}

export interface Story {
  id: string
  title: string
  status: StoryStatus
  epic: string
  epicTitle: string
  domain: string
  priority: StoryPriority
  estimatedEffort: number
  assignedModel: string
  createdAt: string
  updatedAt: string
  dod: string[]
  runs: StoryRun[]
  lessons: StoryLesson[]
}
