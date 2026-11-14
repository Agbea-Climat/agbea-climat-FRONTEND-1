export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const errBody = await response.json().catch(() => ({}));
      throw new ApiError(
        errBody?.error || `Erreur serveur (${response.status})`,
        response.status
      );
    }
    throw new ApiError(`Erreur réseau (${response.status})`, response.status);
  }

  return response.json() as Promise<T>;
}
