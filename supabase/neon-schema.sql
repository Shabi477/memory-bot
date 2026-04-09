-- ThreadMind Schema for Neon Database
-- Run these in Neon SQL Editor to add missing features

-- ============================================
-- EXTEND MOMENTS TABLE
-- ============================================
-- Add summary and key_points columns
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS key_points TEXT[],
ADD COLUMN IF NOT EXISTS moment_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS annotation TEXT;

-- Create index for moment types (decisions, questions, actions)
CREATE INDEX IF NOT EXISTS idx_moments_type ON moments(moment_type);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_moments_fts ON moments 
USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || raw_text));

-- ============================================
-- PROJECTS TABLE (Groups threads)
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- active, paused, complete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Add project_id to threads
ALTER TABLE threads 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_threads_project_id ON threads(project_id);

-- ============================================
-- CONTEXT PACKS TABLE (Saved resume prompts)
-- ============================================
CREATE TABLE IF NOT EXISTS context_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- The generated context pack text
  verbosity TEXT DEFAULT 'standard', -- brief, standard, detailed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_packs_user_id ON context_packs(user_id);

-- ============================================
-- ARTIFACTS TABLE (Code, prompts, documents)
-- ============================================
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moment_id UUID REFERENCES moments(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL, -- code, document, prompt, data, image
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT, -- For code: javascript, python, etc.
  tags TEXT[],
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(artifact_type);

-- ============================================
-- USER SETTINGS & SUBSCRIPTION
-- ============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free', -- free, pro, team
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- ============================================
-- USAGE TRACKING FOR FREEMIUM LIMITS
-- ============================================
CREATE TABLE IF NOT EXISTS usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stat_type TEXT NOT NULL, -- threads_count, moments_count, projects_count
  count INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  UNIQUE(user_id, stat_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user ON usage_stats(user_id, period_start);
