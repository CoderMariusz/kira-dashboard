// Auto-generated types from Supabase
// Run: npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          invite_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          household_id: string | null;
          display_name: string;
          avatar_url: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          household_id?: string | null;
          display_name: string;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          household_id?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
        };
      };
      boards: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          type: 'home' | 'work';
          icon: string;
          color: string;
          columns: string[];
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          type: 'home' | 'work';
          icon?: string;
          color?: string;
          columns?: string[];
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          type?: 'home' | 'work';
          icon?: string;
          color?: string;
          columns?: string[];
          position?: number;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          description: string | null;
          column: 'idea' | 'plan' | 'in_progress' | 'done';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          due_date: string | null;
          assignee_id: string | null;
          created_by: string | null;
          position: number;
          labels: string[];
          subtasks: Json;
          source: string;
          original_message: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          description?: string | null;
          column?: 'idea' | 'plan' | 'in_progress' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          due_date?: string | null;
          assignee_id?: string | null;
          created_by?: string | null;
          position?: number;
          labels?: string[];
          subtasks?: Json;
          source?: string;
          original_message?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          board_id?: string;
          title?: string;
          description?: string | null;
          column?: 'idea' | 'plan' | 'in_progress' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          due_date?: string | null;
          assignee_id?: string | null;
          created_by?: string | null;
          position?: number;
          labels?: string[];
          subtasks?: Json;
          source?: string;
          original_message?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      shopping_lists: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      shopping_items: {
        Row: {
          id: string;
          list_id: string;
          name: string;
          quantity: number;
          unit: string | null;
          category_id: string | null;
          category_name: string;
          store: string | null;
          is_bought: boolean;
          added_by: string | null;
          bought_by: string | null;
          estimated_price: number | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          name: string;
          quantity?: number;
          unit?: string | null;
          category_id?: string | null;
          category_name?: string;
          store?: string | null;
          is_bought?: boolean;
          added_by?: string | null;
          bought_by?: string | null;
          estimated_price?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          name?: string;
          quantity?: number;
          unit?: string | null;
          category_id?: string | null;
          category_name?: string;
          store?: string | null;
          is_bought?: boolean;
          added_by?: string | null;
          bought_by?: string | null;
          estimated_price?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          household_id: string;
          entity_type: 'task' | 'shopping' | 'reminder' | 'board';
          entity_id: string;
          action: string;
          actor_id: string | null;
          actor_name: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          entity_type: 'task' | 'shopping' | 'reminder' | 'board';
          entity_id: string;
          action: string;
          actor_id?: string | null;
          actor_name?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          entity_type?: 'task' | 'shopping' | 'reminder' | 'board';
          entity_id?: string;
          action?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Task = Tables<'tasks'>;
export type Board = Tables<'boards'>;
export type Profile = Tables<'profiles'>;
export type ShoppingItem = Tables<'shopping_items'>;
export type ActivityLog = Tables<'activity_log'>;
