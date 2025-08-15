import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';

export interface DatabaseSchema {
  users: {
    id?: number;
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
    id?: number;
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
    id?: number;
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
    source: string;
    synced_at: string | null;
    timezone: string | null;
    created_at: string;
  };
  user_files: {
    id?: number;
    user_id: number;
    filename: string;
    file_type: string;
    file_path: string;
    uploaded_by: number;
    created_at: string;
  };
  broadcast_messages: {
    id?: number;
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
    id?: number;
    title: string;
    description: string | null;
    video_url: string | null;
    category: string;
    subcategory: string | null;
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
    id?: number;
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
    id?: number;
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
  achievements: {
    id?: number;
    name: string;
    description: string;
    type: string;
    category: string;
    goal_value: number;
    icon_url: string | null;
    reward_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  };
  user_achievements: {
    id: number;
    user_id: number;
    achievement_id: number;
    progress_value: number;
    achieved: number;
    achieved_at: string | null;
    created_at: string;
    updated_at: string;
  };
  user_step_sync: {
    id: number;
    user_id: number;
    google_fit_enabled: number;
    apple_health_enabled: number;
    google_fit_token: string | null;
    apple_health_authorized: number;
    last_sync_date: string | null;
    last_sync_at: string | null;
    sync_errors: string | null;
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
