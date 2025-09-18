CREATE TABLE public.admin_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id),
  CONSTRAINT admin_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.challenge_progress (
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  progress_count integer DEFAULT 0,
  consecutive_days integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  CONSTRAINT challenge_progress_pkey PRIMARY KEY (challenge_id, user_id),
  CONSTRAINT challenge_progress_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id),
  CONSTRAINT challenge_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['entrenamiento'::text, 'nutricion'::text, 'movimiento'::text, 'meditacion'::text])),
  rule jsonb NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenges_pkey PRIMARY KEY (id),
  CONSTRAINT challenges_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.database_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  message text NOT NULL,
  details jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT database_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT database_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
);
CREATE TABLE public.entitlements (
  user_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan = ANY (ARRAY['academia'::text, 'totum'::text, 'personalizado'::text])),
  active boolean NOT NULL DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT entitlements_pkey PRIMARY KEY (user_id, plan),
  CONSTRAINT entitlements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.evaluaciones_salud (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  fecha timestamp without time zone DEFAULT now(),
  resultado jsonb,
  CONSTRAINT evaluaciones_salud_pkey PRIMARY KEY (id),
  CONSTRAINT evaluaciones_salud_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.evaluations_ipaq (
  id bigint NOT NULL DEFAULT nextval('evaluations_ipaq_id_seq'::regclass),
  email text NOT NULL,
  name text,
  phone text,
  consent boolean DEFAULT false,
  answers jsonb NOT NULL,
  met_minutes integer,
  activity_level text CHECK (activity_level = ANY (ARRAY['Bajo'::text, 'Moderado'::text, 'Alto'::text])),
  created_at timestamp with time zone DEFAULT now(),
  result_summary jsonb,
  CONSTRAINT evaluations_ipaq_pkey PRIMARY KEY (id)
);
CREATE TABLE public.evaluations_parq_plus (
  id bigint NOT NULL DEFAULT nextval('evaluations_parq_plus_id_seq'::regclass),
  email text NOT NULL,
  name text,
  phone text,
  consent boolean DEFAULT false,
  answers jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  result_summary jsonb,
  CONSTRAINT evaluations_parq_plus_pkey PRIMARY KEY (id)
);
CREATE TABLE public.evaluations_pss10 (
  id bigint NOT NULL DEFAULT nextval('evaluations_pss10_id_seq'::regclass),
  email text NOT NULL,
  name text,
  phone text,
  consent boolean DEFAULT false,
  answers jsonb NOT NULL,
  total_score integer,
  created_at timestamp with time zone DEFAULT now(),
  result_summary jsonb,
  CONSTRAINT evaluations_pss10_pkey PRIMARY KEY (id)
);
CREATE TABLE public.evaluations_whoqol (
  id bigint NOT NULL DEFAULT nextval('evaluations_whoqol_id_seq'::regclass),
  email text NOT NULL,
  name text,
  phone text,
  consent boolean DEFAULT false,
  answers jsonb NOT NULL,
  total_score integer,
  created_at timestamp with time zone DEFAULT now(),
  result_summary jsonb,
  CONSTRAINT evaluations_whoqol_pkey PRIMARY KEY (id)
);
CREATE TABLE public.goals (
  user_id uuid NOT NULL,
  week_points_goal integer NOT NULL DEFAULT 18,
  daily_steps_goal integer NOT NULL DEFAULT 6500,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT goals_pkey PRIMARY KEY (user_id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.habit_daily_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  habits_completed integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT habit_daily_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT habit_daily_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.habit_logs (
  user_id uuid NOT NULL,
  day date NOT NULL,
  exercise boolean DEFAULT false,
  nutrition boolean DEFAULT false,
  meditation boolean DEFAULT false,
  steps integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  movement boolean DEFAULT false,
  CONSTRAINT habit_logs_pkey PRIMARY KEY (user_id, day),
  CONSTRAINT habit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.habits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  points integer NOT NULL DEFAULT 1,
  category text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT habits_pkey PRIMARY KEY (id)
);
CREATE TABLE public.logros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  puntos_requeridos integer NOT NULL,
  imagen_url text,
  CONSTRAINT logros_pkey PRIMARY KEY (id)
);
CREATE TABLE public.meditations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  sound_url text,
  default_duration_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meditations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  habit_reminders boolean NOT NULL DEFAULT true,
  habit_reminder_time time without time zone NOT NULL DEFAULT '09:00:00'::time without time zone,
  training_reminders boolean NOT NULL DEFAULT true,
  training_reminder_time time without time zone NOT NULL DEFAULT '17:00:00'::time without time zone,
  meditation_reminders boolean NOT NULL DEFAULT true,
  meditation_reminder_time time without time zone NOT NULL DEFAULT '20:00:00'::time without time zone,
  weekly_summary boolean NOT NULL DEFAULT true,
  device_tokens jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_settings_pkey PRIMARY KEY (id),
  CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
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
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.nutrition_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  title text NOT NULL,
  pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  data jsonb,
  CONSTRAINT nutrition_plans_pkey PRIMARY KEY (id),
  CONSTRAINT nutrition_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.pauses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  video_url text,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pauses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  subscription_plan_id uuid,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ARS'::text,
  status text NOT NULL,
  payment_method text,
  transaction_id text UNIQUE,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id)
);
CREATE TABLE public.plan_assignments (
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  active boolean DEFAULT true,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plan_assignments_pkey PRIMARY KEY (user_id, plan_id),
  CONSTRAINT plan_assignments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.training_plans(id),
  CONSTRAINT plan_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.planes (
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
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nombre text,
  apellido text,
  telefono text,
  direccion text,
  ciudad text,
  pais text,
  codigo_postal text,
  fecha_nacimiento date,
  avatar_url text,
  sitio_web text,
  biografia text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.ranking_pasos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  periodo text CHECK (periodo = ANY (ARRAY['semanal'::text, 'mensual'::text])),
  pasos_totales integer DEFAULT 0,
  fecha timestamp without time zone DEFAULT now(),
  CONSTRAINT ranking_pasos_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_pasos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.ranking_puntos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  periodo text CHECK (periodo = ANY (ARRAY['semanal'::text, 'mensual'::text])),
  puntos_totales integer DEFAULT 0,
  fecha timestamp without time zone DEFAULT now(),
  CONSTRAINT ranking_puntos_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_puntos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.recompensas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  automatica boolean DEFAULT false,
  puntos_necesarios integer DEFAULT 0,
  CONSTRAINT recompensas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  price numeric NOT NULL,
  description text,
  features jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.training_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text,
  week integer,
  data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.training_programs (
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
CREATE TABLE public.user_activity_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_activity_logs_y2023m10 (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_activity_logs_y2023m11 (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_activity_logs_y2023m12 (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_habit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  habit_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_habit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT user_habit_logs_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES public.habits(id),
  CONSTRAINT user_habit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_logros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  logro_id uuid,
  fecha_obtenido timestamp without time zone DEFAULT now(),
  CONSTRAINT user_logros_pkey PRIMARY KEY (id),
  CONSTRAINT user_logros_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_logros_logro_id_fkey FOREIGN KEY (logro_id) REFERENCES public.logros(id)
);
CREATE TABLE public.user_recompensas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  recompensa_id uuid,
  fecha timestamp without time zone DEFAULT now(),
  CONSTRAINT user_recompensas_pkey PRIMARY KEY (id),
  CONSTRAINT user_recompensas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_recompensas_recompensa_id_fkey FOREIGN KEY (recompensa_id) REFERENCES public.recompensas(id)
);
CREATE TABLE public.user_roles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'moderator'::text, 'user'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  name text,
  profile_picture_url text,
  subscription_plan_id uuid,
  has_training_access boolean NOT NULL DEFAULT false,
  has_nutrition_access boolean NOT NULL DEFAULT false,
  has_pause_access boolean NOT NULL DEFAULT false,
  has_meditation_access boolean NOT NULL DEFAULT false,
  current_habit_points integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  puntos integer DEFAULT 0,
  pasos integer DEFAULT 0,
  ranking_puntos integer,
  ranking_pasos integer,
  created_at timestamp with time zone DEFAULT now(),
  email text NOT NULL UNIQUE,
  health_assessment_results jsonb,
  is_admin boolean,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id)
);
CREATE TABLE public.videos (
  id bigint NOT NULL DEFAULT nextval('videos_id_seq'::regclass),
  title text NOT NULL,
  category text CHECK (category = ANY (ARRAY['entrenamiento'::text, 'pausas'::text, 'meditacion'::text, 'ejercicios'::text])),
  youtube_url text NOT NULL,
  public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  alias text,
  CONSTRAINT videos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.videos_ejercicios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text,
  url_video text,
  categoria text,
  creado_en timestamp without time zone DEFAULT now(),
  youtube_id text UNIQUE,
  CONSTRAINT videos_ejercicios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workout_feedback (
  user_id uuid NOT NULL,
  day date NOT NULL,
  rpe integer NOT NULL CHECK (rpe >= 1 AND rpe <= 10),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workout_feedback_pkey PRIMARY KEY (user_id, day),
  CONSTRAINT workout_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);


**esta base de datos es la vieja
