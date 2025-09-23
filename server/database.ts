import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  // No tirar el server: loguear y continuar para que /health funcione,
  // pero avisar claramente en consola.
  console.warn(
    '[database] Falta configuración de Supabase. ' +
    'Definí SUPABASE_URL y SUPABASE_SERVICE_ROLE en el entorno.'
  );
}

// Cliente admin (server-side)
export const supabaseAdmin = createClient(
  SUPABASE_URL ?? 'http://localhost:54321',
  SUPABASE_SERVICE_ROLE ?? 'missing-key',
  {
    auth: { persistSession: false },
  }
);

// Por compatibilidad con importaciones existentes:
export const db = supabaseAdmin as unknown as any;

export default supabaseAdmin;
