import type { Db } from '../client.js';
import type { DrinkRow, DrinkPriceRow } from '../types.js';

export interface CreateDrinkInput {
  name: string;
  initialPriceCents: number;
}

export interface DrinkWithCurrentPrice extends DrinkRow {
  current_price_cents: number | null;
}

export class DrinksRepo {
  constructor(private readonly db: Db) {}

  findById(id: number): DrinkRow | undefined {
    return this.db.prepare<[number], DrinkRow>('SELECT * FROM drinks WHERE id = ?').get(id);
  }

  findAll(onlyAvailable = false): DrinkRow[] {
    const sql = onlyAvailable
      ? 'SELECT * FROM drinks WHERE is_available = 1 ORDER BY name'
      : 'SELECT * FROM drinks ORDER BY name';
    return this.db.prepare<[], DrinkRow>(sql).all();
  }

  /** Gibt alle verfügbaren Getränke inkl. des aktuell gültigen Preises zurück. */
  findAvailableWithCurrentPrice(): DrinkWithCurrentPrice[] {
    return this.db
      .prepare<[], DrinkWithCurrentPrice>(
        `SELECT d.*,
                (SELECT dp.price_cents
                 FROM drink_prices dp
                 WHERE dp.drink_id = d.id
                   AND dp.valid_from <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 ORDER BY dp.valid_from DESC, dp.id DESC
                 LIMIT 1) AS current_price_cents
         FROM drinks d
         WHERE d.is_available = 1
         ORDER BY d.name`,
      )
      .all();
  }

  /** Erstellt ein Getränk und legt gleichzeitig den ersten Preis an. */
  create(input: CreateDrinkInput): DrinkRow {
    const result = this.db
      .prepare<{ name: string }>('INSERT INTO drinks (name) VALUES (@name)')
      .run({ name: input.name });

    const drinkId = result.lastInsertRowid as number;

    this.db
      .prepare('INSERT INTO drink_prices (drink_id, price_cents) VALUES (@drink_id, @price_cents)')
      .run({ drink_id: drinkId, price_cents: input.initialPriceCents });

    return this.findById(drinkId)!;
  }

  /** Deaktiviert ein Getränk (Soft-Delete). */
  deactivate(id: number): boolean {
    const result = this.db.prepare('UPDATE drinks SET is_available = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ---------------------------------------------------------------------------
  // Preisverwaltung
  // ---------------------------------------------------------------------------

  getCurrentPrice(drinkId: number): DrinkPriceRow | undefined {
    return this.db
      .prepare<[number], DrinkPriceRow>(
        `SELECT * FROM drink_prices
         WHERE drink_id = ?
           AND valid_from <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         ORDER BY valid_from DESC, id DESC
         LIMIT 1`,
      )
      .get(drinkId);
  }

  getPriceHistory(drinkId: number): DrinkPriceRow[] {
    return this.db
      .prepare<
        [number],
        DrinkPriceRow
      >('SELECT * FROM drink_prices WHERE drink_id = ? ORDER BY valid_from DESC, id DESC')
      .all(drinkId);
  }

  /**
   * Setzt einen neuen Preis ab sofort (oder ab einem zukünftigen Zeitpunkt).
   * Der alte Preis bleibt in der Historie erhalten.
   */
  addPrice(drinkId: number, priceCents: number, validFrom?: string): DrinkPriceRow {
    const result = this.db
      .prepare(
        `INSERT INTO drink_prices (drink_id, price_cents, valid_from)
         VALUES (@drink_id, @price_cents, @valid_from)`,
      )
      .run({
        drink_id: drinkId,
        price_cents: priceCents,
        valid_from: validFrom ?? new Date().toISOString(),
      });

    return this.db
      .prepare<[number], DrinkPriceRow>('SELECT * FROM drink_prices WHERE id = ?')
      .get(result.lastInsertRowid as number)!;
  }
}
