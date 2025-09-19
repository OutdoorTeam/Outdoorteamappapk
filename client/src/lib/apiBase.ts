const rawBase = import.meta.env.VITE_API_BASE?.trim() ?? '';
export const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function resolveApiUrl(path: string): string {
  if (!path) {
    return API_BASE;
  }

  if (isAbsoluteUrl(path)) {
    return path;
  }

  if (!API_BASE) {
    if (path.startsWith('/')) {
      return path;
    }
    return `/${path}`;
  }

  if (path.startsWith('/')) {
    return `${API_BASE}${path}`;
  }

  return `${API_BASE}/${path}`;
}
