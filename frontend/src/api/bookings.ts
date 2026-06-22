import { apiFetch } from './client.js';
import type { BookingRow, PaginatedBookings } from '../types/api.js';

export const bookingsApi = {
  /** Buchung anlegen */
  create(drinkId: number): Promise<BookingRow> {
    return apiFetch<BookingRow>('/bookings', { method: 'POST', body: { drink_id: drinkId } });
  },

  /** Buchung für ein anderes Mitglied anlegen (Theken-/Allgemein-Konto) */
  createForMember(memberId: number, drinkId: number): Promise<BookingRow> {
    return apiFetch<BookingRow>('/bookings', {
      method: 'POST',
      body: { drink_id: drinkId, member_id: memberId },
    });
  },

  /** Eigene Buchungen (paginiert) */
  getMine(limit = 50, beforeId?: number): Promise<PaginatedBookings> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeId !== undefined) params.set('before', String(beforeId));
    return apiFetch<PaginatedBookings>(`/bookings/me?${params.toString()}`);
  },

  /** Buchungen eines bestimmten Mitglieds (Theken-/Allgemein-Konto) */
  getForMember(memberId: number, limit = 50, beforeId?: number): Promise<PaginatedBookings> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeId !== undefined) params.set('before', String(beforeId));
    return apiFetch<PaginatedBookings>(`/bookings/member/${memberId}?${params.toString()}`);
  },

  /** Admin: alle Buchungen mit optionalen Filtern */
  getAll(filter?: {
    member_id?: number;
    from?: string;
    to?: string;
    include_voided?: boolean;
    limit?: number;
  }): Promise<BookingRow[]> {
    const params = new URLSearchParams();
    if (filter?.member_id !== undefined) params.set('member_id', String(filter.member_id));
    if (filter?.from) params.set('from', filter.from);
    if (filter?.to) params.set('to', filter.to);
    if (filter?.include_voided) params.set('include_voided', 'true');
    if (filter?.limit !== undefined) params.set('limit', String(filter.limit));
    const qs = params.toString();
    return apiFetch<BookingRow[]>(`/bookings${qs ? `?${qs}` : ''}`);
  },

  /** Buchung stornieren */
  void(bookingId: number, reason?: string): Promise<BookingRow> {
    return apiFetch<BookingRow>(`/bookings/${bookingId}/void`, {
      method: 'POST',
      body: reason !== undefined ? { reason } : {},
    });
  },
};
