// Database types for Supabase
// These types match the SQL schema

export interface Database {
  public: {
    Tables: {
      threads: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      moments: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          source: string;
          source_url: string | null;
          title: string | null;
          raw_text: string;
          summary: string | null;
          key_points: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          user_id: string;
          source: string;
          source_url?: string | null;
          title?: string | null;
          raw_text: string;
          summary?: string | null;
          key_points?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          user_id?: string;
          source?: string;
          source_url?: string | null;
          title?: string | null;
          raw_text?: string;
          summary?: string | null;
          key_points?: string[] | null;
          created_at?: string;
        };
      };
    };
  };
}

// Convenience types
export type Thread = Database['public']['Tables']['threads']['Row'];
export type ThreadInsert = Database['public']['Tables']['threads']['Insert'];
export type Moment = Database['public']['Tables']['moments']['Row'];
export type MomentInsert = Database['public']['Tables']['moments']['Insert'];
