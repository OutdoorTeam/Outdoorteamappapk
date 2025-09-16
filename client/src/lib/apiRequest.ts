// client/src/lib/apiRequest.ts
const API_DISABLED = import.meta.env.VITE_DISABLE_API === 'true';

type Json = any;

export async function apiRequest(path: string, init: RequestInit = {}): Promise<{ data: Json; error: string | null }> {
  if (API_DISABLED) {
    console.warn('[API desactivada] bloqueada llamada a:', path);
    return { data: null, error: 'API desactivada (modo sin backend)' };
  }
  const res = await fetch(path, init);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { data: null, error: (data && (data as any).error) || `HTTP ${res.status}` };
  }
  return { data, error: null };
}

