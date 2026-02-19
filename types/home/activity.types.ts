// types/home/activity.types.ts
// Typy dla Activity Feed (STORY-4.3)

export interface ActivityEvent {
  id:           string                  // UUID v4
  household_id: string                  // UUID
  actor_id:     string | null           // UUID usera lub null (system action)
  actor_name:   string | null           // Nazwa wyświetlana, nawet po usunięciu usera
  action:       string                  // np. 'shopping_added', 'task_moved', 'task_completed'
  entity_type:  string                  // np. 'shopping_item', 'task', 'member'
  entity_id:    string | null           // UUID encji (może być usunięta)
  entity_name:  string | null           // Nazwa encji (zapisana redundantnie)
  details:      Record<string, unknown> // Elastyczne JSONB dane
  created_at:   string                  // ISO 8601
}
