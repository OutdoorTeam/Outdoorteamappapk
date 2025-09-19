import { Kysely, PostgresDialect, SqliteDialect, type ColumnType, type Generated } from 'kysely';

export interface DatabaseSchema {
  users: {
    id: Generated<number>;
    email: string;
    password_hash: string | null;
    full_name: string;
    role: string;
    plan_type: string | null;
    is_active: number;
    features_json: string;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  habits: {
    id: Generated<number>;
    user_id: number;
    name: string;
    is_completed: number;
    date: string;
    created_at: ColumnType<string, string | undefined, never>;
  };
  daily_habits: {
    id: Generated<number>;
    user_id: number;
    date: string;
    training_completed: number;
    nutrition_completed: number;
    movement_completed: number;
    meditation_completed: number;
    daily_points: number;
    steps: number;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  daily_history: {
    id: Generated<number>;
    user_id: number;
    date: string;
    daily_points: number;
    steps: number;
    training_completed: number;
    nutrition_completed: number;
    movement_completed: number;
    meditation_completed: number;
    notes_content: string | null;
    archived_at: string;
  };
  user_notes: {
    id: Generated<number>;
    user_id: number;
    content: string;
    date: string;
    created_at: ColumnType<string, string | undefined, never>;
  };
  step_counts: {
    id: Generated<number>;
    user_id: number;
    steps: number;
    date: string;
    created_at: ColumnType<string, string | undefined, never>;
  };
  user_files: {
    id: Generated<number>;
    user_id: number;
    filename: string;
    file_type: string;
    file_path: string;
    uploaded_by: number;
    created_at: ColumnType<string, string | undefined, never>;
  };
  broadcast_messages: {
    id: Generated<number>;
    sender_id: number;
    message: string;
    created_at: ColumnType<string, string | undefined, never>;
  };
  plans: {
    id: Generated<number>;
    name: string;
    description: string;
    price: number;
    services_included: string;
    features_json: string;
    is_active: number;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  content_library: {
    id: Generated<number>;
    title: string;
    description: string | null;
    video_url: string | null;
    category: string;
    subcategory: string | null;
    is_active: number;
    created_at: ColumnType<string, string | undefined, never>;
  };
  content_videos: {
    id: Generated<number>;
    title: string;
    description: string | null;
    category: string;
    video_url: string;
    is_active: number;
    created_at: ColumnType<string, string | undefined, never>;
  };
  workout_of_day: {
    id: Generated<number>;
    title: string;
    description: string | null;
    exercises_json: string;
    date: string;
    is_active: number;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  meditation_sessions: {
    id: Generated<number>;
    user_id: number;
    duration_minutes: number;
    meditation_type: string;
    breathing_cycle_json: string | null;
    comment: string | null;
    completed_at: string;
  };
  daily_reset_log: {
    id: Generated<number>;
    reset_date: string;
    executed_at: string;
    users_processed: number;
    total_daily_points: number;
    total_steps: number;
    total_notes: number;
    status: string;
    error_message: string | null;
    execution_time_ms: number;
    created_at: ColumnType<string, string | undefined, never>;
  };
  system_logs: {
    id: Generated<number>;
    level: string;
    event: string;
    user_id: number | null;
    route: string | null;
    ip_address: string | null;
    user_agent: string | null;
    metadata: string | null;
    created_at: ColumnType<string, string | undefined, never>;
  };
  user_notifications: {
    id: Generated<number>;
    user_id: number;
    enabled: number;
    habits: string;
    times: string;
    push_token: string | null;
    push_endpoint: string | null;
    push_keys: string | null;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  notification_jobs: {
    id: Generated<number>;
    user_id: number;
    habit_key: string;
    reminder_time: string;
    next_send_at: string;
    created_at: ColumnType<string, string | undefined, never>;
  };
  nutrition_plans: {
    id: Generated<number>;
    user_id: number;
    content_md: string | null;
    version: number;
    status: string;
    created_by: number | null;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  training_plans: {
    id: Generated<number>;
    user_id: number;
    title: string | null;
    version: number;
    status: string;
    created_by: number | null;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  training_plan_days: {
    id: Generated<number>;
    plan_id: number;
    day_index: number;
    title: string | null;
    notes: string | null;
    sort_order: number;
  };
  training_exercises: {
    id: Generated<number>;
    day_id: number;
    sort_order: number;
    exercise_name: string;
    content_library_id: number | null;
    youtube_url: string | null;
    sets: number | null;
    reps: string | null;
    intensity: string | null;
    rest_seconds: number | null;
    tempo: string | null;
    notes: string | null;
  };
  training_plan_schedules: {
    id: Generated<number>;
    user_id: number;
    plan_title: string | null;
    week_number: number;
    status: string;
    created_by: number | null;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  training_plan_exercises: {
    id: Generated<number>;
    schedule_id: number;
    day_name: string;
    exercise_name: string;
    content_library_id: number | null;
    video_url: string | null;
    sets: number | null;
    reps: string | null;
    rest_seconds: number | null;
    intensity: string | null;
    notes: string | null;
    sort_order: number;
  };
  user_permissions: {
    id: Generated<number>;
    user_id: number;
    dashboard_enabled: number;
    training_enabled: number;
    nutrition_enabled: number;
    meditation_enabled: number;
    active_breaks_enabled: number;
    exercises_enabled: number;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
  user_goals: {
    id: Generated<number>;
    user_id: number;
    daily_steps_goal: number;
    weekly_points_goal: number;
    created_at: ColumnType<string, string | undefined, never>;
    updated_at: ColumnType<string, string | undefined, string>;
  };
}

const usePg = Boolean(process.env.DATABASE_URL);

async function createDb(): Promise<Kysely<DatabaseSchema>> {
  if (usePg) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    return new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({ pool }),
      log: ['query', 'error']
    });
  }

  const { default: BetterSqlite3 } = await import('better-sqlite3');
  const sqlitePath = process.env.SQLITE_PATH ?? 'data/app.db';
  const sqlite = new BetterSqlite3(sqlitePath);

  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({ database: sqlite }),
    log: ['query', 'error']
  });
}

export const db = await createDb();

