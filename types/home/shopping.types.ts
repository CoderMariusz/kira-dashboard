// types/home/shopping.types.ts
// Typy dla listy zakupów (STORY-4.3)

export interface ShoppingItem {
  id:           string        // UUID v4
  household_id: string        // UUID — FK do households
  name:         string        // Nazwa produktu, np. "Mleko"
  category:     string        // Kategoria, np. "Nabiał", domyślnie "Inne"
  quantity:     number        // Ilość, min 1
  unit:         string | null // Jednostka, np. "kg", "szt", null jeśli brak
  is_bought:    boolean       // false = na liście, true = kupione
  bought_at:    string | null // ISO 8601 timestamp lub null
  added_by:     string | null // UUID usera który dodał, null jeśli usunięty
  created_at:   string        // ISO 8601
  updated_at:   string        // ISO 8601
}

// DTO do tworzenia — bez pól auto-generowanych
export type ShoppingItemCreate = Pick<ShoppingItem,
  'name' | 'category' | 'quantity'
> & {
  unit?: string | null
  household_id: string
}

// DTO do aktualizacji — wszystkie pola opcjonalne
export type ShoppingItemUpdate = Partial<Pick<ShoppingItem,
  'name' | 'category' | 'quantity' | 'unit' | 'is_bought'
>>
