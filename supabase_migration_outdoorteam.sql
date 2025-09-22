-- supabase_migration_outdoorteam.sql
--
-- This migration script adds new tables and columns required by the
-- OutdoorTeam backend and defines row‑level security (RLS) policies.
-- It is idempotent: running it multiple times will not cause errors or
-- duplicate objects because each operation checks for existence before
-- creating anything.

-- 1) Add `is_active` column to public.users (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'is_active'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- 2) Create table public.content_library
CREATE TABLE IF NOT EXISTS public.content_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text,
  category text NOT NULL CHECK (category IN ('exercise','active_breaks','meditation')),
  subcategory text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS and add a read policy for content_library
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='content_library' AND policyname='content_library_read_all'
  ) THEN
    CREATE POLICY content_library_read_all
      ON public.content_library FOR SELECT
      USING (true);
  END IF;
END $$;

-- 3) Create table public.broadcast_messages
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS and add a read policy for broadcast_messages
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='broadcast_messages' AND policyname='broadcast_messages_read_all'
  ) THEN
    CREATE POLICY broadcast_messages_read_all
      ON public.broadcast_messages FOR SELECT
      USING (true);
  END IF;
END $$;

-- 4) Create table public.user_plan_assignments (many‑to‑many relation)
CREATE TABLE IF NOT EXISTS public.user_plan_assignments (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_id)
);

-- Index to speed up lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_plan_assignments_user
  ON public.user_plan_assignments(user_id);

-- Enable RLS and restrict reads to the owning user
ALTER TABLE public.user_plan_assignments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_plan_assignments' AND policyname='upa_select_own'
  ) THEN
    CREATE POLICY upa_select_own
      ON public.user_plan_assignments FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Note: No insert/update/delete policies are defined for the new tables.
-- These operations should be performed by the backend using the service role key.
