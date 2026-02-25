// types/patterns.ts
// STORY-8.3 — TypeScript types for Patterns page
// Zero `any` — every field has an explicit type.

export type PatternType    = 'PATTERN' | 'ANTI_PATTERN'
export type LessonSeverity = 'info' | 'warning' | 'critical'
export type PatternSource  = 'patterns.md' | 'anti-patterns.md'
export type LessonSource   = 'LESSONS_LEARNED.md' | 'anti-patterns.md'

export interface PatternCard {
  id:              string
  source:          PatternSource
  type:            PatternType
  category:        string
  date:            string | null
  model:           string | null
  domain:          string | null
  text:            string
  tags:            string[]
  related_stories: string[]
  occurrences:     number
}

export interface Lesson {
  id:         string
  source:     LessonSource
  title:      string
  severity:   LessonSeverity
  category:   string
  date:       string | null
  body:       string
  root_cause: string | null
  fix:        string | null
  lesson:     string
  tags:       string[]
}

export interface PatternsMeta {
  total_patterns: number
  total_lessons:  number
  sources:        string[]
  generated_at:   string
}

export interface PatternsResponse {
  patterns: PatternCard[]
  lessons:  Lesson[]
  meta:     PatternsMeta
}

// DTOs for POST endpoints
export interface AddPatternDTO {
  type:             PatternType
  category:         string
  text:             string
  model?:           string
  domain?:          string
  date?:            string
  related_stories?: string[]
}

export interface AddLessonDTO {
  id:          string
  title:       string
  severity:    LessonSeverity
  category:    string
  body:        string
  root_cause?: string
  fix?:        string
  lesson:      string
  tags?:       string[]
  date?:       string
}

export interface ApiError {
  statusCode: number
  message:    string
}
