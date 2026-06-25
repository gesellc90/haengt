import { apiFetch } from './client.js';
import type { VerbindungRow } from '../types/api.js';

export const verbindungenApi = {
  getAll(includeInactive = false): Promise<VerbindungRow[]> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    return apiFetch<VerbindungRow[]>(`/verbindungen${qs}`);
  },

  create(data: {
    name: string;
    zirkel?: string | null;
    ort?: string | null;
  }): Promise<VerbindungRow> {
    return apiFetch<VerbindungRow>('/verbindungen', { method: 'POST', body: data });
  },

  update(
    id: number,
    data: { name?: string; zirkel?: string | null; ort?: string | null; active?: 0 | 1 },
  ): Promise<VerbindungRow> {
    return apiFetch<VerbindungRow>(`/verbindungen/${id}`, { method: 'PATCH', body: data });
  },

  deactivate(id: number): Promise<void> {
    return apiFetch<void>(`/verbindungen/${id}`, { method: 'DELETE' });
  },
};
