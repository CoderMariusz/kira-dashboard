// types/home/household.types.ts
// Typy dla Household (STORY-4.3, STORY-4.7)

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

/** Extended member — zawiera dane profilu z auth.users (STORY-4.7) */
export interface HouseholdMemberExtended extends HouseholdMember {
  display_name: string   // z auth.users.user_metadata lub email prefix
  email:        string   // z auth.users.email
}

/** Zaproszenie do household (STORY-4.7) */
export type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export interface HouseholdInvite {
  id:           string         // UUID v4
  household_id: string         // UUID
  email:        string         // Adres email zaproszenia
  invited_by:   string         // UUID (user_id osoby zapraszającej)
  status:       InviteStatus
  token:        string         // Unikalny token zaproszenia
  expires_at:   string         // ISO 8601
  created_at:   string         // ISO 8601
  accepted_at:  string | null  // ISO 8601 lub null
}
