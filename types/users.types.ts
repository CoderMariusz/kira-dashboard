// types/users.types.ts
// Typy dla zarządzania użytkownikami (STORY-3.8)

import type { Role } from './auth.types';

/** Wiersz użytkownika zwracany przez GET /api/users */
export interface UserRow {
  id: string;          // UUID — Supabase auth user id
  email: string;       // adres email użytkownika
  role: Role;          // 'ADMIN' | 'HELPER_PLUS' | 'HELPER'
  created_at: string;  // ISO 8601 string: "2026-02-19T10:00:00Z"
}
