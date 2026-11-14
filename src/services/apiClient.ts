/**
 * Single configurable HTTP client targeting /api/v1 (or VITE_API_BASE_URL).
 * Automatically detects static hosting (e.g. Vercel without an /api/v1 server)
 * and enables direct NASA POWER/GIBS client mode when no local backend is mounted.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || '/api/v1'
).replace(/\/$/, '');

export const HAS_CUSTOM_BACKEND = Boolean(
  import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL !== '/api/v1'
);

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let probePromise: Promise<'backend' | 'standalone' | 'offline'> | null = null;

export function resetBackendProbe(): void {
  probePromise = null;
}

export async function detectBackendMode(): Promise<'backend' | 'standalone' | 'offline'> {
  if (probePromise) return probePromise;

  probePromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        headers: { Accept: 'application/json' },
      });
      const contentType = response.headers.get('content-type') || '';

      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json().catch(() => null);
        if (data && data.status === 'ok') {
          return 'backend';
        }
        return 'offline';
      }

      // On static hosts like Vercel without a mounted /api/v1 server,
      // /api/v1/health returns 404 or SPA HTML fallback (text/html).
      if (!HAS_CUSTOM_BACKEND && (response.status === 404 || !contentType.includes('application/json'))) {
        if (response.status < 500) {
          return 'standalone';
        }
      }

      return 'offline';
    } catch {
      return 'offline';
    }
  })();

  return probePromise;
}

export function buildApiUrl(
  path: string,
  query?: Record<string, string | number | undefined | null>
): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = `${API_BASE_URL}${normalized}`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined && val !== null && val !== '') {
      params.set(key, String(val));
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function requestJson<T>(
  path: string,
  options?: RequestInit & { query?: Record<string, string | number | undefined | null> }
): Promise<T> {
  const { query, ...init } = options || {};
  const url = buildApiUrl(path, query);

  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const errBody = await response.json().catch(() => ({}));
      const msg =
        errBody?.message ||
        errBody?.error?.message ||
        errBody?.error ||
        `Error ${response.status}`;
      throw new ApiError(msg, response.status, errBody?.code);
    }
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}
