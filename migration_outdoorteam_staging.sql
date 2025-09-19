-- Migration script to align outdoorteam‑staging with the schema of the legacy
-- Mioutdoorteam database.  This script is idempotent where possible and
-- attempts to create missing tables, columns and objects without
-- overwriting existing data or structures.  Run this against the
-- `outdoorteam‑staging` database.  Ensure you have appropriate
-- privileges before executing.

/*
 * 1. Create tables that are present in the old schema but absent in
 *    the staging database.  The definitions below are derived from
 *    the `sql/old_schema_dump.sql` file in the repository.  All
 *    foreign keys reference existing tables.  Tables are created
 *    only if they do not already exist.
 */

-- Health evaluations and surveys
CREATE TABLE IF NOT EXISTS public.evaluaciones_salud (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  fecha timestamp without time zone DEFAULT now(),
  resultado jsonb,
  CONSTRAINT evaluaciones_salud_pkey PRIMARY KEY (id),
  CONSTRAINT evaluaciones_salud_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.evaluations_ipaq (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  name text,
  phone text,
  consent boolean DEFAULT false,
  answers jsonb NOT NULL,
  met_minutes integer,
  activity_level text CHECK (activity_level = ANY (ARRAY['Bajo','Moderado','Alto'])),
  created_at timestamp with time zone DEFAULT now(),
  result_summary jsonb
);

CREATE TABLE IF NOT EXISTS public.evaluations_parq_plus (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  name text,
  phone text,
  consent boolean DEFAULT false,
  answers jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  result_summary jsonb
);

CREATE TABLE IF NOT EXISTS public.evaluations_pss10 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  name text,
  phone text,
  consent boolean DEFAULT false,
  answers jsonb NOT NULL,
  total_score integer,
  created_at timestamp with time zone DEFAULT now(),
  result_summary jsonb
);

CREATE TABLE IF NOT EXISTS public.evaluations_whoqol (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  name text,
  phone text,
  consent boolean DEFAULT false,
  answers jsonb NOT NULL,
  total_score integer,
  created_at timestamp with time zone DEFAULT now(),
  result_summary jsonb
);

-- Achievement tracking
CREATE TABLE IF NOT EXISTS public.logros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  puntos_requeridos integer NOT NULL,
  imagen_url text,
  CONSTRAINT logros_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.meditations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  sound_url text,
  default_duration_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meditations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  type text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  sent boolean NOT NULL DEFAULT false,
  scheduled_for timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Pause and payment related tables
CREATE TABLE IF NOT EXISTS public.pauses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  video_url text,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pauses_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  subscription_plan_id uuid,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ARS',
  status text NOT NULL,
  payment_method text,
  transaction_id text UNIQUE,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id)
);

CREATE TABLE IF NOT EXISTS public.plan_assignments (
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  active boolean DEFAULT true,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plan_assignments_pkey PRIMARY KEY (user_id, plan_id),
  CONSTRAINT plan_assignments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.training_plans(id),
  CONSTRAINT plan_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.planes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  precio numeric NOT NULL,
  incluye_entrenamiento boolean DEFAULT false,
  incluye_nutricion boolean DEFAULT false,
  incluye_meditacion boolean DEFAULT false,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT planes_pkey PRIMARY KEY (id)
);

-- Ranking and reward tables
CREATE TABLE IF NOT EXISTS public.ranking_pasos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  periodo text CHECK (periodo = ANY (ARRAY['semanal','mensual'])),
  pasos_totales integer DEFAULT 0,
  fecha timestamp without time zone DEFAULT now(),
  CONSTRAINT ranking_pasos_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_pasos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.ranking_puntos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  periodo text CHECK (periodo = ANY (ARRAY['semanal','mensual'])),
  puntos_totales integer DEFAULT 0,
  fecha timestamp without time zone DEFAULT now(),
  CONSTRAINT ranking_puntos_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_puntos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.recompensas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  automatica boolean DEFAULT false,
  puntos_necesarios integer DEFAULT 0,
  CONSTRAINT recompensas_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.training_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text,
  week integer,
  data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_plans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.training_programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  pdf_url text,
  video_urls jsonb,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_programs_pkey PRIMARY KEY (id)
);

-- Activity and habit logs
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Partitioned activity logs tables for specific months (materialized in the old DB).
-- These tables share the same structure as `user_activity_logs`.
CREATE TABLE IF NOT EXISTS public.user_activity_logs_y2023m10 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_logs_y2023m10_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.user_activity_logs_y2023m11 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_logs_y2023m11_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.user_activity_logs_y2023m12 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_logs_y2023m12_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.user_habit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  habit_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_habit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT user_habit_logs_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES public.habits(id),
  CONSTRAINT user_habit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.user_logros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  logro_id uuid,
  fecha_obtenido timestamp without time zone DEFAULT now(),
  CONSTRAINT user_logros_pkey PRIMARY KEY (id),
  CONSTRAINT user_logros_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_logros_logro_id_fkey FOREIGN KEY (logro_id) REFERENCES public.logros(id)
);

CREATE TABLE IF NOT EXISTS public.user_recompensas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  recompensa_id uuid,
  fecha timestamp without time zone DEFAULT now(),
  CONSTRAINT user_recompensas_pkey PRIMARY KEY (id),
  CONSTRAINT user_recompensas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_recompensas_recompensa_id_fkey FOREIGN KEY (recompensa_id) REFERENCES public.recompensas(id)
);

CREATE TABLE IF NOT EXISTS public.videos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  category text CHECK (category = ANY (ARRAY['entrenamiento','pausas','meditacion','ejercicios'])),
  youtube_url text NOT NULL,
  public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  alias text
);

CREATE TABLE IF NOT EXISTS public.videos_ejercicios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text,
  url_video text,
  categoria text,
  creado_en timestamp without time zone DEFAULT now(),
  youtube_id text UNIQUE,
  CONSTRAINT videos_ejercicios_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workout_feedback (
  user_id uuid NOT NULL,
  day date NOT NULL,
  rpe integer NOT NULL CHECK (rpe >= 1 AND rpe <= 10),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workout_feedback_pkey PRIMARY KEY (user_id, day),
  CONSTRAINT workout_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

/*
 * 2. Alter existing tables to add columns that were present in the old
 *    schema but missing in the staging database.  Use ADD COLUMN IF
 *    NOT EXISTS to prevent errors on subsequent runs.
 */

-- nutrition_plans: add pdf_url, updated_at, user_id
ALTER TABLE IF EXISTS public.nutrition_plans
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- profiles: add sitio_web
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS sitio_web text;

-- users: add name, profile_picture_url, current_habit_points, is_active, health_assessment_results
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS profile_picture_url text,
  ADD COLUMN IF NOT EXISTS current_habit_points integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS health_assessment_results jsonb;

/*
 * 3. Add recommended index, constraint and triggers for data quality.
 */

-- Create an index on habit_logs(user_id, day) to speed up queries by user and day.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'habit_logs_user_day_idx'
  ) THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY habit_logs_user_day_idx ON public.habit_logs (user_id, day)';
  END IF;
END;
$$;

-- Enforce non‑negative steps in habit_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'habit_logs_steps_nonnegative'
      AND conrelid = 'public.habit_logs'::regclass
  ) THEN
    ALTER TABLE public.habit_logs
      ADD CONSTRAINT habit_logs_steps_nonnegative CHECK (steps >= 0);
  END IF;
END;
$$;

-- Trigger to maintain full_name in profiles
CREATE OR REPLACE FUNCTION public.set_full_name() RETURNS trigger AS $$
BEGIN
  NEW.full_name := COALESCE(TRIM(NEW.nombre || ' ' || NEW.apellido), NEW.full_name, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'profiles_set_full_name'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    EXECUTE 'DROP TRIGGER profiles_set_full_name ON public.profiles';
  END IF;
  EXECUTE 'CREATE TRIGGER profiles_set_full_name
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_full_name()';
END;
$$;

/*
 * End of migration script.
 */