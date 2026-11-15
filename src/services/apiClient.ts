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

/**
 * True when the probed backend is the real AGBÉA API (every response wrapped as
 * {"status":"success","message":"OK","response":<payload>}). False for the local
 * server.ts mock, which returns un-enveloped payloads in the front contract shape.
 */
let envelopedBackend = false;

export function resetBackendProbe(): void {
  probePromise = null;
}

/** Whether the detected backend uses the real AGBÉA response envelope. */
export async function isEnvelopedBackend(): Promise<boolean> {
  const mode = await detectBackendMode();
  return mode === 'backend' && envelopedBackend;
}

interface ApiEnvelope<T = unknown> {
  status: string;
  message?: string;
  response?: T;
}

function isEnvelope(body: unknown): body is ApiEnvelope {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    'response' in body &&
    typeof (body as ApiEnvelope).status === 'string'
  );
}

/** Returns the payload of an enveloped response, or the body unchanged (server.ts mock). */
export function unwrapEnvelope<T>(body: unknown): T {
  if (isEnvelope(body)) return body.response as T;
  return body as T;
}

/** Builds an ApiError from an error body (enveloped or legacy shapes). */
export function toApiError(body: any, status: number): ApiError {
  if (isEnvelope(body)) {
    const payload = (body.response || {}) as { code?: string };
    return new ApiError(body.message || `Error ${status}`, status, payload.code);
  }
  const msg =
    body?.message ||
    body?.error?.message ||
    (typeof body?.error === 'string' ? body.error : undefined) ||
    `Error ${status}`;
  return new ApiError(msg, status, body?.code);
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
        // Real backend: {"status":"success","response":{"status":"ok"}}
        if (isEnvelope(data)) {
          const payload = data.response as { status?: string } | null | undefined;
          if (data.status === 'success' && payload?.status === 'ok') {
            envelopedBackend = true;
            return 'backend';
          }
          return 'offline';
        }
        // Local server.ts mock: {"status":"ok"}
        if (data && data.status === 'ok') {
          envelopedBackend = false;
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
      throw toApiError(errBody, response.status);
    }
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  const body = await response.json();
  // Envelope with a non-success status on a 2xx response is still an error.
  if (isEnvelope(body) && body.status !== 'success') {
    throw toApiError(body, response.status);
  }
  return unwrapEnvelope<T>(body);
}
