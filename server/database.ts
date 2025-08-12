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
    is_active: number;
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
