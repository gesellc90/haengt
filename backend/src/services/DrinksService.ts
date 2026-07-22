import type { DrinksRepo } from '../db/repos/DrinksRepo.js';
import type { DrinkCategoriesRepo } from '../db/repos/DrinkCategoriesRepo.js';
import type { AuditLogRepo } from '../db/repos/AuditLogRepo.js';
import type { DrinkRow, DrinkPriceRow } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';
import type { DrinkWithCurrentPrice, DrinkWithCategory } from '../db/repos/DrinksRepo.js';

// ---------------------------------------------------------------------------
// DrinksService — Business-Logik für Getränke- und Preisverwaltung
// ---------------------------------------------------------------------------

export class DrinksService {
  constructor(
    private readonly drinks: DrinksRepo,
    private readonly categories: DrinkCategoriesRepo,
    private readonly auditLog: AuditLogRepo,
  ) {}

  /** Stellt sicher, dass die Kategorie existiert (sonst 400). */
  private assertCategoryExists(categoryId: number): void {
    if (!this.categories.findById(categoryId)) {
      throw new AppError('Kategorie nicht gefunden', 400, 'CATEGORY_NOT_FOUND');
    }
  }

  // ---------------------------------------------------------------------------
  // Lesen
  // ---------------------------------------------------------------------------

  /** Öffentliche Liste: nur verfügbare Getränke + aktueller Preis (User-Endpunkt). */
  findAvailable(): DrinkWithCurrentPrice[] {
    return this.drinks.findAvailableWithCurrentPrice();
  }

  /** Admin-Liste: alle Getränke (inkl. deaktivierter) mit Kategorie-Info. */
  findAll(): DrinkWithCategory[] {
    return this.drinks.findAllWithCategory();
  }

  findById(id: number): DrinkRow {
    const drink = this.drinks.findById(id);
    if (!drink) throw new AppError('Getränk nicht gefunden', 404, 'NOT_FOUND');
    return drink;
  }

  getPriceHistory(drinkId: number): DrinkPriceRow[] {
    this.findById(drinkId); // 404 wenn nicht vorhanden
    return this.drinks.getPriceHistory(drinkId);
  }

  // ---------------------------------------------------------------------------
  // Anlegen
  // ---------------------------------------------------------------------------

  create(
    input: { name: string; price_cents: number; category_id: number },
    actorId: number,
  ): DrinkRow {
    this.assertCategoryExists(input.category_id);

    const drink = this.drinks.create({
      name: input.name,
      categoryId: input.category_id,
      initialPriceCents: input.price_cents,
    });

    this.auditLog.create({
      event_type: 'drink_created',
      actor_id: actorId,
      target_type: 'drink',
      target_id: drink.id,
      meta: {
        name: input.name,
        category_id: input.category_id,
        initial_price_cents: input.price_cents,
      },
    });

    return drink;
  }

  // ---------------------------------------------------------------------------
  // Aktualisieren
  // ---------------------------------------------------------------------------

  update(
    id: number,
    input: { name?: string; is_available?: 0 | 1; category_id?: number },
    actorId: number,
  ): DrinkRow {
    const existing = this.drinks.findById(id);
    if (!existing) throw new AppError('Getränk nicht gefunden', 404, 'NOT_FOUND');

    if (input.category_id !== undefined) {
      this.assertCategoryExists(input.category_id);
    }

    const updated = this.drinks.update(id, input);

    this.auditLog.create({
      event_type: 'drink_updated',
      actor_id: actorId,
      target_type: 'drink',
      target_id: id,
      meta: { changed_fields: Object.keys(input) },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Preisverwaltung
  // ---------------------------------------------------------------------------

  addPrice(
    drinkId: number,
    input: { price_cents: number; valid_from?: string },
    actorId: number,
  ): DrinkPriceRow {
    this.findById(drinkId); // 404 wenn Getränk nicht vorhanden

    const priceRow = this.drinks.addPrice(drinkId, input.price_cents, input.valid_from);

    this.auditLog.create({
      event_type: 'drink_price_added',
      actor_id: actorId,
      target_type: 'drink',
      target_id: drinkId,
      meta: {
        price_cents: input.price_cents,
        valid_from: input.valid_from ?? new Date().toISOString(),
      },
    });

    return priceRow;
  }
}
