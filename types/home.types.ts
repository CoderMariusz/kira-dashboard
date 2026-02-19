// types/home.types.ts
// Typy dla modułu Home (STORY-4.1): households, members, shopping, tasks, activity.

export type HouseholdMemberRole = 'ADMIN' | 'HELPER+' | 'HELPER'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface HouseholdRow {
  id: string
  name: string
  invite_code: string | null
  created_at: string
  updated_at: string
}

export interface HouseholdMemberRow {
  id: string
  household_id: string
  user_id: string
  role: HouseholdMemberRole
  joined_at: string
}

export interface ColumnRow {
  id: string
  household_id: string
  name: string
  position: number
  created_at: string
}

export interface ShoppingItemRow {
  id: string
  household_id: string
  name: string
  category: string
  quantity: number
  unit: string | null
  is_bought: boolean
  bought_at: string | null
  added_by: string | null
  created_at: string
  updated_at: string
}

export interface TaskRow {
  id: string
  household_id: string
  column_id: string
  title: string
  description: string | null
  priority: TaskPriority
  position: number
  assigned_to: string | null
  due_date: string | null
  created_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLogRow {
  id: string
  household_id: string
  actor_id: string | null
  actor_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  details: Record<string, unknown>
  created_at: string
}

export type HouseholdInsert = Pick<HouseholdRow, 'name'>

export type HouseholdMemberInsert = Pick<
  HouseholdMemberRow,
  'household_id' | 'user_id' | 'role'
>

export type ColumnInsert = Pick<ColumnRow, 'household_id' | 'name' | 'position'>

export type ShoppingItemInsert = Pick<
  ShoppingItemRow,
  'household_id' | 'name' | 'category' | 'quantity' | 'unit' | 'added_by'
>

export type TaskInsert = Pick<
  TaskRow,
  | 'household_id'
  | 'column_id'
  | 'title'
  | 'description'
  | 'priority'
  | 'position'
  | 'assigned_to'
  | 'due_date'
  | 'created_by'
>

export type ActivityLogInsert = Pick<
  ActivityLogRow,
  | 'household_id'
  | 'actor_id'
  | 'actor_name'
  | 'action'
  | 'entity_type'
  | 'entity_id'
  | 'entity_name'
  | 'details'
>
