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
}

const dataDirectory = process.env.DATA_DIRECTORY || './data';
const sqliteDb = new Database(path.join(dataDirectory, 'database.sqlite'));

export const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({
    database: sqliteDb,
  }),
  log: ['query', 'error']
});
