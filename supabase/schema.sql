-- AI Chat Organiser - Supabase SQL Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (should already be enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- THREADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for threads
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON public.threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON public.threads(updated_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for threads
CREATE POLICY "Users can view their own threads"
  ON public.threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads"
  ON public.threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON public.threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
  ON public.threads FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- MOMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- e.g., 'chatgpt', 'claude', 'gemini'
  source_url TEXT, -- URL of the original chat
  title TEXT, -- Optional user-provided or generated title
  raw_text TEXT NOT NULL, -- The captured chat content
  summary TEXT, -- AI-generated or simple summary
  key_points TEXT[], -- Array of key points (3-6 items)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for moments
CREATE INDEX IF NOT EXISTS idx_moments_thread_id ON public.moments(thread_id);
CREATE INDEX IF NOT EXISTS idx_moments_user_id ON public.moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON public.moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_source ON public.moments(source);

-- Full-text search index for searching moments
CREATE INDEX IF NOT EXISTS idx_moments_search ON public.moments 
  USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || raw_text));

-- Enable RLS (Row Level Security)
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moments
CREATE POLICY "Users can view their own moments"
  ON public.moments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own moments"
  ON public.moments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moments"
  ON public.moments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moments"
  ON public.moments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: Update thread timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.threads 
  SET updated_at = NOW() 
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update thread timestamp when moment is added
DROP TRIGGER IF EXISTS on_moment_created ON public.moments;
CREATE TRIGGER on_moment_created
  AFTER INSERT ON public.moments
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();
