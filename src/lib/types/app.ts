import type { Database } from './database';

// ═══════════════════════════════════════════════════════════
// Aliasy typów z bazy danych
// ═══════════════════════════════════════════════════════════

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// ═══════════════════════════════════════════════════════════
// Wygodne typy per tabela
// ═══════════════════════════════════════════════════════════

export type Household = Tables<'households'>;
export type Profile = Tables<'profiles'>;
export type Board = Tables<'boards'>;
export type Task = Tables<'tasks'>;
export type ShoppingList = Tables<'shopping_lists'>;
export type ShoppingItem = Tables<'shopping_items'>;
export type ActivityLog = Tables<'activity_log'>;

// ═══════════════════════════════════════════════════════════
// Rozszerzone typy (z join-ami)
// ═══════════════════════════════════════════════════════════

export type TaskWithAssignee = Task & {
  assignee: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
};

export type ShoppingItemWithBuyer = ShoppingItem & {
  buyer: Pick<Profile, 'id' | 'display_name'> | null;
};

export type ActivityLogWithActor = ActivityLog & {
  actor: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
};

// ═══════════════════════════════════════════════════════════
// Enum types
// ═══════════════════════════════════════════════════════════

export type TaskColumn = 'idea' | 'plan' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type BoardType = 'home' | 'work';

// ═══════════════════════════════════════════════════════════
// UI types
// ═══════════════════════════════════════════════════════════

export interface ColumnConfig {
  key: TaskColumn;
  label: string;
  color: string;
}
