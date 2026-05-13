import { apiFetch } from './client.js';
import type { PublicMember } from '../types/api.js';

export const membersApi = {
  /** Admin: alle Mitglieder */
  getAll(includeInactive = false): Promise<PublicMember[]> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    return apiFetch<PublicMember[]>(`/members${qs}`);
  },

  /** Admin: Mitglied anlegen */
  create(data: {
    username: string;
    display_name: string;
    password: string;
    role?: 'admin' | 'member';
  }): Promise<PublicMember> {
    return apiFetch<PublicMember>('/members', { method: 'POST', body: data });
  },

  /** Admin: Mitglied aktualisieren (display_name, role, is_active, password) */
  update(
    id: number,
    data: {
      display_name?: string;
      role?: 'admin' | 'member';
      is_active?: 0 | 1;
      password?: string;
    },
  ): Promise<PublicMember> {
    return apiFetch<PublicMember>(`/members/${id}`, { method: 'PATCH', body: data });
  },

  /** Admin: Mitglied deaktivieren (Soft-Delete) */
  deactivate(id: number): Promise<void> {
    return apiFetch<void>(`/members/${id}`, { method: 'DELETE' });
  },
};
