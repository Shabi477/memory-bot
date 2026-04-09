import { neon } from '@neondatabase/serverless';

// Create a SQL client
export const sql = neon(process.env.DATABASE_URL!);

// Helper types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: Date;
}

export interface Thread {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Moment {
  id: string;
  thread_id: string;
  user_id: string;
  source: string;
  source_url: string | null;
  title: string | null;
  raw_text: string;
  created_at: Date;
}
