// Stub de cliente API para desarrollo sin backend
type Resp<T = any> = Promise<{ data: T }>;
const ok = <T = any>(data: T = null as any): Resp<T> => Promise.resolve({ data });

const DISABLED = import.meta.env.VITE_DISABLE_API === 'true';

// Interface "axios-like" mínima
export const api = DISABLED
  ? {
      get: ok,
      post: ok,
      put: ok,
      delete: ok,
    }
  : (await import('axios')).default.create({ baseURL: '/api' });

export default api;

