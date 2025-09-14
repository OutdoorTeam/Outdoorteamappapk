// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // No frenamos el build, pero avisamos en dev.
  // Revisa tu .env.local si ves este error en consola.
  // eslint-disable-next-line no-console
  console.error(
    '[Supabase] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en .env.local'
  );
}

export const supabase = createClient(url!, anon!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Helper opcional para probar desde consola del navegador:
//   import { whoAmI } from '@/lib/supabaseClient'; whoAmI().then(console.log)
export async function whoAmI() {
  const { data } = await supabase.auth.getUser();
  return data.user; // null si no hay sesión
}
