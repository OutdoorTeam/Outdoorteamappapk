import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';

export interface DatabaseSchema {
  users: {
    id: number;
    email: string;
    password_hash: string | null;
    full_name: string;
    role: string;
    plan_type: string | null;
    is_active: number;
    features_json: string;
    created_at: string;
    updated_at: string;
  };
  habits: {
    id: number;
    user_id: number;
    name: string;
    is_completed: number;
    date: string;
    created_at: string;
  };
  daily_habits: {
    id: number;
    user_id: number;
    date: string;
    training_completed: number;
    nutrition_completed: number;
    movement_completed: number;
    meditation_completed: number;
    daily_points: number;
    steps: number;
    created_at: string;
    updated_at: string;
  };
  daily_history: {
    id: number;
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
    id: number;
    user_id: number;
    content: string;
    date: string;
    created_at: string;
  };
  step_counts: {
    id: number;
    user_id: number;
    steps: number;
    date: string;
    created_at: string;
  };
  user_files: {
    id: number;
    user_id: number;
    filename: string;
    file_type: string;
    file_path: string;
    uploaded_by: number;
    created_at: string;
  };
  broadcast_messages: {
    id: number;
    sender_id: number;
    message: string;
    created_at: string;
  };
  plans: {
    id: number;
    name: string;
    description: string;
    price: number;
    services_included: string;
    features_json: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  };
  content_library: {
    id: number;
    title: string;
    description: string | null;
    video_url: string | null;
    category: string;
    subcategory: string | null;
    is_active: number;
    created_at: string;
  };
  content_videos: {
    id: number;
    title: string;
    description: string | null;
    category: string;
    video_url: string;
    is_active: number;
    created_at: string;
  };
  workout_of_day: {
    id: number;
    title: string;
    description: string | null;
    exercises_json: string;
    date: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  };
  meditation_sessions: {
    id: number;
    user_id: number;
    duration_minutes: number;
    meditation_type: string;
    breathing_cycle_json: string | null;
    comment: string | null;
    completed_at: string;
  };
  daily_reset_log: {
    id: number;
    reset_date: string;
    executed_at: string;
    users_processed: number;
    total_daily_points: number;
    total_steps: number;
    total_notes: number;
    status: string;
    error_message: string | null;
    execution_time_ms: number;
    created_at: string;
  };
  system_logs: {
    id: number;
    level: string;
    event: string;
    user_id: number | null;
    route: string | null;
    ip_address: string | null;
    user_agent: string | null;
    metadata: string | null;
    created_at: string;
  };
  user_notifications: {
    id: number;
    user_id: number;
    enabled: number;
    habits: string;
    times: string;
    push_token: string | null;
    push_endpoint: string | null;
    push_keys: string | null;
    created_at: string;
    updated_at: string;
  };
  notification_jobs: {
    id: number;
    user_id: number;
    habit_key: string;
    reminder_time: string;
    next_send_at: string;
    created_at: string;
  };
  nutrition_plans: {
    id: number;
    user_id: number;
    content_md: string | null;
    version: number;
    status: string;
    created_by: number | null;
    created_at: string;
    updated_at: string;
  };
  training_plans: {
    id: number;
    user_id: number;
    title: string | null;
    version: number;
    status: string;
    created_by: number | null;
    created_at: string;
    updated_at: string;
  };
  training_plan_days: {
    id: number;
    plan_id: number;
    day_index: number;
    title: string | null;
    notes: string | null;
    sort_order: number;
  };
  training_exercises: {
    id: number;
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
  user_permissions: {
    id: number;
    user_id: number;
    dashboard_enabled: number;
    training_enabled: number;
    nutrition_enabled: number;
    meditation_enabled: number;
    active_breaks_enabled: number;
    exercises_enabled: number;
    created_at: string;
    updated_at: string;
  };
  user_goals: {
    id: number;
    user_id: number;
    daily_steps_goal: number;
    weekly_points_goal: number;
    created_at: string;
    updated_at: string;
  };
}

const dataDirectory = process.env.DATA_DIRECTORY || './data';
const sqliteDb = new Database(path.join(dataDirectory, 'database.sqlite'));

export const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({
    database: sqliteDb,
  }),
  log: ['query', 'error']
});
