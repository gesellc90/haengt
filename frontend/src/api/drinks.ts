import { apiFetch } from './client.js';
import type { DrinkWithCurrentPrice, DrinkRow, DrinkPriceRow } from '../types/api.js';

export const drinksApi = {
  /** User: verfügbare Getränke mit aktuellem Preis */
  getAvailable(): Promise<DrinkWithCurrentPrice[]> {
    return apiFetch<DrinkWithCurrentPrice[]>('/drinks');
  },

  /** Admin: alle Getränke (inkl. deaktivierter) */
  getAll(): Promise<DrinkRow[]> {
    return apiFetch<DrinkRow[]>('/drinks');
  },

  /** Admin: Getränk anlegen (Kategorie ist Pflicht) */
  create(data: { name: string; category_id: number; price_cents: number }): Promise<DrinkRow> {
    return apiFetch<DrinkRow>('/drinks', { method: 'POST', body: data });
  },

  /** Admin: Getränk aktualisieren */
  update(
    id: number,
    data: { name?: string; is_available?: 0 | 1; category_id?: number },
  ): Promise<DrinkRow> {
    return apiFetch<DrinkRow>(`/drinks/${id}`, { method: 'PATCH', body: data });
  },

  /** Admin: Preis hinzufügen */
  addPrice(
    drinkId: number,
    data: { price_cents: number; valid_from?: string },
  ): Promise<DrinkPriceRow> {
    return apiFetch<DrinkPriceRow>(`/drinks/${drinkId}/prices`, { method: 'POST', body: data });
  },

  /** Admin: Preishistorie */
  getPriceHistory(drinkId: number): Promise<DrinkPriceRow[]> {
    return apiFetch<DrinkPriceRow[]>(`/drinks/${drinkId}/prices`);
  },
};
