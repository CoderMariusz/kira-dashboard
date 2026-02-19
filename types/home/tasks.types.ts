// types/home/tasks.types.ts
// Typy dla Kanban Board (STORY-4.3)

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id:           string              // UUID v4
  household_id: string              // UUID — FK do households
  column_id:    string              // UUID — FK do columns
  title:        string              // Tytuł zadania
  description:  string | null       // Opcjonalny opis
  label?:       string | null       // Opcjonalna etykieta/tag zadania (AC-3)
  priority:     TaskPriority        // Priorytet
  position:     number              // Pozycja w kolumnie (integer, krok 1000)
  assigned_to:  string | null       // UUID usera, null jeśli nieprzypisany
  due_date:     string | null       // Format YYYY-MM-DD lub null
  completed_at: string | null       // ISO 8601 lub null
  created_by:   string | null       // UUID usera który stworzył
  created_at:   string              // ISO 8601
  updated_at:   string              // ISO 8601
  subtasks?:    string[]            // Opcjonalna lista podzadań (AC-8)
}

export interface Column {
  id:           string   // UUID v4
  household_id: string   // UUID — FK do households
  name:         string   // Nazwa kolumny, np. "Do zrobienia"
  position:     number   // Pozycja (0 = pierwsza kolumna od lewej)
  created_at:   string   // ISO 8601
}

export interface ColumnWithTasks extends Column {
  tasks: Task[]  // posortowane po position ASC
}

export type TaskCreate = Pick<Task,
  'household_id' | 'column_id' | 'title'
> & {
  description?: string
  priority?:    TaskPriority
  assigned_to?: string | null
  due_date?:    string | null
}

export type TaskUpdate = Partial<Pick<Task,
  'title' | 'description' | 'priority' | 'assigned_to' | 'due_date' | 'completed_at' | 'column_id' | 'position'
>>

export interface MoveTask {
  taskId:         string
  targetColumnId: string
  position:       number
}
