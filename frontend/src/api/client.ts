// ---------------------------------------------------------------------------
// API-Client — zentraler fetch-Wrapper mit Auth-Interceptor
// ---------------------------------------------------------------------------

const BASE_URL = '/api/v1';
const TOKEN_KEY = 'token';

// ---------------------------------------------------------------------------
// Token-Verwaltung
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// API-Fehler-Klasse
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Kern-Fetch-Funktion
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Wenn true, wird kein Authorization-Header gesetzt */
  anonymous?: boolean;
}

/**
 * Führt einen API-Call gegen `/api/v1` aus.
 * Bei 401 wird das Token gelöscht und ein Event für den AuthContext gefeuert.
 * Wirft `ApiError` bei HTTP-Fehlercodes.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, anonymous = false } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (!anonymous) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content — kein Body
  if (response.status === 204) {
    return undefined as T;
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(response.status, 'Ungültige Server-Antwort');
  }

  if (!response.ok) {
    const err = json as { error?: string; code?: string; details?: unknown };

    // 401 → Token ungültig, Event feuern damit der AuthContext reagieren kann
    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    throw new ApiError(response.status, err.error ?? 'Unbekannter Fehler', err.code, err.details);
  }

  return json as T;
}

/**
 * Lädt eine FormData-Datei hoch (POST, multipart). Kein Content-Type-Header —
 * der Browser setzt ihn inkl. Boundary automatisch.
 */
export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(response.status, 'Ungültige Server-Antwort');
  }

  if (!response.ok) {
    const err = json as { error?: string; code?: string; details?: unknown };
    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new ApiError(response.status, err.error ?? 'Unbekannter Fehler', err.code, err.details);
  }

  return json as T;
}
