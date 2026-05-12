import type { DrinksRepo } from '../db/repos/DrinksRepo.js';
import type { AuditLogRepo } from '../db/repos/AuditLogRepo.js';
import type { DrinkRow, DrinkPriceRow } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';
import type { DrinkWithCurrentPrice } from '../db/repos/DrinksRepo.js';

// ---------------------------------------------------------------------------
// DrinksService — Business-Logik für Getränke- und Preisverwaltung
// ---------------------------------------------------------------------------

export class DrinksService {
  constructor(
    private readonly drinks: DrinksRepo,
    private readonly auditLog: AuditLogRepo,
  ) {}

  // ---------------------------------------------------------------------------
  // Lesen
  // ---------------------------------------------------------------------------

  /** Öffentliche Liste: nur verfügbare Getränke + aktueller Preis (User-Endpunkt). */
  findAvailable(): DrinkWithCurrentPrice[] {
    return this.drinks.findAvailableWithCurrentPrice();
  }

  /** Admin-Liste: alle Getränke (inkl. deaktivierter). */
  findAll(): DrinkRow[] {
    return this.drinks.findAll(false);
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

  create(input: { name: string; price_cents: number }, actorId: number): DrinkRow {
    const drink = this.drinks.create({
      name: input.name,
      initialPriceCents: input.price_cents,
    });

    this.auditLog.create({
      event_type: 'drink_created',
      actor_id: actorId,
      target_type: 'drink',
      target_id: drink.id,
      meta: { name: input.name, initial_price_cents: input.price_cents },
    });

    return drink;
  }

  // ---------------------------------------------------------------------------
  // Aktualisieren
  // ---------------------------------------------------------------------------

  update(id: number, input: { name?: string; is_available?: 0 | 1 }, actorId: number): DrinkRow {
    const existing = this.drinks.findById(id);
    if (!existing) throw new AppError('Getränk nicht gefunden', 404, 'NOT_FOUND');

    // Direktes UPDATE im Repo (DrinksRepo hat noch kein update() → inline mit DB)
    // Da DrinksRepo kein generisches update() hat, delegieren wir nur an deactivate()
    // oder führen das Update über den Repo durch – wir erweitern DrinksRepo minimal.
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
