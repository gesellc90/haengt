import { apiFetch } from './client.js';
import type { ZeigerRow, BookingRow } from '../types/api.js';

export const zeigerApi = {
  getAll(status?: 'offen' | 'geschlossen'): Promise<ZeigerRow[]> {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<ZeigerRow[]>(`/zeiger${qs}`);
  },

  getById(id: number): Promise<ZeigerRow> {
    return apiFetch<ZeigerRow>(`/zeiger/${id}`);
  },

  create(data: {
    titel: string;
    art: 'veranstaltung' | 'besuch';
    verbindung_id?: number | null;
    anzahl_bundesbrueder?: number | null;
    anzahl_gaeste?: number | null;
  }): Promise<ZeigerRow> {
    return apiFetch<ZeigerRow>('/zeiger', { method: 'POST', body: data });
  },

  update(
    id: number,
    data: { anzahl_bundesbrueder?: number | null; anzahl_gaeste?: number | null },
  ): Promise<ZeigerRow> {
    return apiFetch<ZeigerRow>(`/zeiger/${id}`, { method: 'PATCH', body: data });
  },

  close(
    id: number,
    data?: { anzahl_bundesbrueder?: number; anzahl_gaeste?: number },
  ): Promise<ZeigerRow> {
    return apiFetch<ZeigerRow>(`/zeiger/${id}/close`, { method: 'POST', body: data ?? {} });
  },

  getBookings(id: number): Promise<BookingRow[]> {
    return apiFetch<BookingRow[]>(`/zeiger/${id}/bookings`);
  },
};
