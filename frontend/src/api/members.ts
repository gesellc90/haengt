import { apiFetch } from './client.js';
import type { MemberStatus, PublicMember } from '../types/api.js';

export const membersApi = {
  /** Admin: alle Mitglieder */
  getAll(includeInactive = false): Promise<PublicMember[]> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    return apiFetch<PublicMember[]>(`/members${qs}`);
  },

  /** Theken-/Allgemein-Konto: bebuchbare Mitglieder, nach Kategorie sortiert */
  getBookable(): Promise<PublicMember[]> {
    return apiFetch<PublicMember[]>('/members/bookable');
  },

  /** WK/Admin: streichbare Personen-Konten (inkl. bereits gestrichener), nach Kategorie sortiert */
  getStrikeable(): Promise<PublicMember[]> {
    return apiFetch<PublicMember[]>('/members/strikeable');
  },

  /** Admin: Mitglied anlegen */
  create(data: {
    username: string;
    display_name: string;
    password: string;
    role?: 'admin' | 'member';
    member_status?: MemberStatus;
    is_wirtschaftskommission?: boolean;
    email?: string;
  }): Promise<PublicMember> {
    return apiFetch<PublicMember>('/members', { method: 'POST', body: data });
  },

  /** Admin: Mitglied aktualisieren (display_name, role, is_active, password, Kategorie, Theken-Flag, WK-Flag, E-Mail) */
  update(
    id: number,
    data: {
      display_name?: string;
      role?: 'admin' | 'member';
      is_active?: 0 | 1;
      password?: string;
      member_status?: MemberStatus;
      can_book_for_others?: boolean;
      is_wirtschaftskommission?: boolean;
      email?: string | null;
    },
  ): Promise<PublicMember> {
    return apiFetch<PublicMember>(`/members/${id}`, { method: 'PATCH', body: data });
  },

  /** WK/Admin: Konto für 2 Wochen streichen */
  strike(id: number): Promise<PublicMember> {
    return apiFetch<PublicMember>(`/members/${id}/strike`, { method: 'POST' });
  },

  /** WK/Admin: Konto vorzeitig entstreichen */
  unstrike(id: number): Promise<PublicMember> {
    return apiFetch<PublicMember>(`/members/${id}/unstrike`, { method: 'POST' });
  },

  /** Admin: Mitglied deaktivieren (Soft-Delete) */
  deactivate(id: number): Promise<void> {
    return apiFetch<void>(`/members/${id}`, { method: 'DELETE' });
  },
};
