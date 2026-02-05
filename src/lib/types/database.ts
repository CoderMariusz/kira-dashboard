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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'profiles_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'boards_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'tasks_board_id_fkey';
            columns: ['board_id'];
            isOneToOne: false;
            referencedRelation: 'boards';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'shopping_lists_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'shopping_items_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'shopping_lists';
            referencedColumns: ['id'];
          },
        ];
      };
      shopping_categories: {
        Row: {
          id: string;
          name: string;
          icon: string;
          color: string;
          position: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string;
          color?: string;
          position?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          color?: string;
          position?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'activity_log_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          email: string;
          invited_by: string;
          status: 'pending' | 'accepted' | 'rejected' | 'expired';
          token: string;
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          email: string;
          invited_by: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
          token: string;
          expires_at: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          email?: string;
          invited_by?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
          token?: string;
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      labels: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          color: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'labels_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      task_labels: {
        Row: {
          task_id: string;
          label_id: string;
          created_at: string;
        };
        Insert: {
          task_id: string;
          label_id: string;
          created_at?: string;
        };
        Update: {
          task_id?: string;
          label_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_labels_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_labels_label_id_fkey';
            columns: ['label_id'];
            isOneToOne: false;
            referencedRelation: 'labels';
            referencedColumns: ['id'];
          },
        ];
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
export type ShoppingCategory = Tables<'shopping_categories'>;
export type ActivityLog = Tables<'activity_log'>;
export type HouseholdInvite = Tables<'household_invites'>;
export type Label = Tables<'labels'>;
export type TaskLabel = Tables<'task_labels'>;
