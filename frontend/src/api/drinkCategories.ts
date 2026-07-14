import { apiFetch } from './client.js';
import type { DrinkCategoryRow } from '../types/api.js';

export const drinkCategoriesApi = {
  /** Alle Kategorien in Anzeige-Reihenfolge (für alle eingeloggten Nutzer). */
  getAll(): Promise<DrinkCategoryRow[]> {
    return apiFetch<DrinkCategoryRow[]>('/drink-categories');
  },

  /** Admin: Kategorie anlegen */
  create(data: { name: string }): Promise<DrinkCategoryRow> {
    return apiFetch<DrinkCategoryRow>('/drink-categories', { method: 'POST', body: data });
  },

  /** Admin: Kategorie umbenennen / sort_order ändern */
  update(id: number, data: { name?: string; sort_order?: number }): Promise<DrinkCategoryRow> {
    return apiFetch<DrinkCategoryRow>(`/drink-categories/${id}`, { method: 'PATCH', body: data });
  },

  /** Admin: Kategorie löschen (nur wenn keine Getränke zugeordnet sind) */
  remove(id: number): Promise<void> {
    return apiFetch<void>(`/drink-categories/${id}`, { method: 'DELETE' });
  },

  /** Admin: gesamte Reihenfolge neu setzen (alle IDs in gewünschter Folge) */
  reorder(orderedIds: number[]): Promise<DrinkCategoryRow[]> {
    return apiFetch<DrinkCategoryRow[]>('/drink-categories/order', {
      method: 'PUT',
      body: { ordered_ids: orderedIds },
    });
  },
};
