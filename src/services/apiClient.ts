/**
 * Single configurable HTTP client targeting /api/v1 (or VITE_API_BASE_URL).
 * Replace VITE_API_BASE_URL in .env to connect directly to the team's backend.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || '/api/v1'
).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function buildApiUrl(path: string, query?: Record<string, string | number | undefined | null>): string {
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
