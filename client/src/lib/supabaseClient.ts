// client/src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

let cachedClient: SupabaseClient | null = null;

export const supabase = (() => {
  if (cachedClient) return cachedClient;
  cachedClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'ot-auth',
    },
  });

  if (typeof window !== 'undefined') {
    (window as any).supabase = cachedClient;
  }

  return cachedClient;
})();
