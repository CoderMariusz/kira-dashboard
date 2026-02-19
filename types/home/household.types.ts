// types/home/household.types.ts
// Typy dla Household (STORY-4.3)

export type HouseholdRole = 'ADMIN' | 'HELPER+' | 'HELPER'

export interface Household {
  id:          string   // UUID v4
  name:        string   // Nazwa household, np. "Rodzina Kowalskich"
  invite_code: string   // Unikalny kod zaproszenia (6-12 znaków)
  created_at:  string   // ISO 8601
  updated_at:  string   // ISO 8601
}

export interface HouseholdMember {
  id:           string         // UUID v4
  household_id: string         // UUID
  user_id:      string         // UUID (auth.users)
  role:         HouseholdRole  // 'ADMIN' | 'HELPER+' | 'HELPER'
  joined_at:    string         // ISO 8601
}
