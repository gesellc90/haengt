import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiFetch,
  apiUpload,
  ApiError,
  getToken,
  setToken,
  clearToken,
} from '../../src/api/client';

// ---------------------------------------------------------------------------
// Hilfsfunktionen: fetch-Antworten simulieren
// ---------------------------------------------------------------------------

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

function noContentResponse(): Response {
  return {
    status: 204,
    ok: true,
    json: async () => {
      throw new Error('204 hat keinen Body');
    },
  } as unknown as Response;
}

function invalidJsonResponse(status: number): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      throw new SyntaxError('Unexpected token');
    },
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Token-Verwaltung
// ---------------------------------------------------------------------------

describe('Token-Verwaltung', () => {
  it('set/get/clear arbeiten auf localStorage', () => {
    expect(getToken()).toBeNull();
    setToken('abc');
    expect(getToken()).toBe('abc');
    expect(localStorage.getItem('token')).toBe('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

describe('apiFetch', () => {
  it('ruft die BASE_URL an und parst JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { hello: 'world' }));

    const result = await apiFetch<{ hello: string }>('/ping');

    expect(result).toEqual({ hello: 'world' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/ping',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('setzt den Authorization-Header, wenn ein Token vorliegt', async () => {
    setToken('mein-token');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiFetch('/me');

    const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer mein-token');
  });

  it('setzt keinen Authorization-Header bei anonymous', async () => {
    setToken('mein-token');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiFetch('/login', { anonymous: true });

    const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('serialisiert den Body als JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 1 }));

    await apiFetch('/bookings', { method: 'POST', body: { drink_id: 3 } });

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ drink_id: 3 }));
  });

  it('gibt bei 204 undefined zurück', async () => {
    fetchMock.mockResolvedValue(noContentResponse());
    await expect(apiFetch('/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('wirft ApiError mit Status, Message und Code bei Fehlerantwort', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: 'Belegt', code: 'EMAIL_TAKEN', details: { field: 'email' } }),
    );

    await expect(apiFetch('/members')).rejects.toMatchObject({
      status: 409,
      message: 'Belegt',
      code: 'EMAIL_TAKEN',
      details: { field: 'email' },
    });
  });

  it('wirft ApiError bei ungültigem JSON', async () => {
    fetchMock.mockResolvedValue(invalidJsonResponse(200));

    await expect(apiFetch('/broken')).rejects.toMatchObject({
      status: 200,
      message: 'Ungültige Server-Antwort',
    });
  });

  it('löscht bei 401 das Token und feuert auth:unauthorized', async () => {
    setToken('abgelaufen');
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Abgelaufen' }));

    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);

    await expect(apiFetch('/me')).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBeNull();
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('auth:unauthorized', handler);
  });
});

// ---------------------------------------------------------------------------
// apiUpload
// ---------------------------------------------------------------------------

describe('apiUpload', () => {
  it('sendet FormData ohne Content-Type-Header, aber mit Token', async () => {
    setToken('mein-token');
    fetchMock.mockResolvedValue(jsonResponse(200, { avatar_path: '1.webp' }));

    const fd = new FormData();
    const result = await apiUpload<{ avatar_path: string }>('/me/avatar', fd);

    expect(result).toEqual({ avatar_path: '1.webp' });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(fd);
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers['Authorization']).toBe('Bearer mein-token');
  });

  it('löscht bei 401 das Token und feuert auth:unauthorized', async () => {
    setToken('abgelaufen');
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Abgelaufen' }));

    const handler = vi.fn();
    window.addEventListener('auth:unauthorized', handler);

    await expect(apiUpload('/me/avatar', new FormData())).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBeNull();
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('auth:unauthorized', handler);
  });
});
