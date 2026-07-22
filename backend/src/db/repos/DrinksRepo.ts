import type { Db } from '../client.js';
import type { DrinkRow, DrinkPriceRow } from '../types.js';

export interface CreateDrinkInput {
  name: string;
  categoryId: number;
  initialPriceCents: number;
}

/** Getränk inkl. Kategorie-Name (für Admin-Liste). */
export interface DrinkWithCategory extends DrinkRow {
  category_name: string;
  category_sort_order: number;
}

export interface DrinkWithCurrentPrice extends DrinkRow {
  current_price_cents: number | null;
  category_name: string;
  category_sort_order: number;
}

export class DrinksRepo {
  constructor(private readonly db: Db) {}

  findById(id: number): DrinkRow | undefined {
    return this.db.prepare<[number], DrinkRow>('SELECT * FROM drinks WHERE id = ?').get(id);
  }

  /**
   * Admin-Liste aller Getränke inkl. Kategorie-Name, sortiert nach
   * Kategorie-Reihenfolge und dann nach Getränkename.
   */
  findAllWithCategory(): DrinkWithCategory[] {
    return this.db
      .prepare<[], DrinkWithCategory>(
        `SELECT d.*,
                c.name       AS category_name,
                c.sort_order AS category_sort_order
         FROM drinks d
         JOIN drink_categories c ON c.id = d.category_id
         ORDER BY c.sort_order, c.name COLLATE NOCASE, d.name COLLATE NOCASE`,
      )
      .all();
  }

  findAll(onlyAvailable = false): DrinkRow[] {
    const sql = onlyAvailable
      ? 'SELECT * FROM drinks WHERE is_available = 1 ORDER BY name'
      : 'SELECT * FROM drinks ORDER BY name';
    return this.db.prepare<[], DrinkRow>(sql).all();
  }

  /**
   * Gibt alle verfügbaren Getränke inkl. des aktuell gültigen Preises und der
   * Kategorie zurück, sortiert nach Kategorie-Reihenfolge und Getränkename.
   */
  findAvailableWithCurrentPrice(): DrinkWithCurrentPrice[] {
    return this.db
      .prepare<[], DrinkWithCurrentPrice>(
        `SELECT d.*,
                c.name       AS category_name,
                c.sort_order AS category_sort_order,
                (SELECT dp.price_cents
                 FROM drink_prices dp
                 WHERE dp.drink_id = d.id
                   AND dp.valid_from <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 ORDER BY dp.valid_from DESC, dp.id DESC
                 LIMIT 1) AS current_price_cents
         FROM drinks d
         JOIN drink_categories c ON c.id = d.category_id
         WHERE d.is_available = 1
         ORDER BY c.sort_order, c.name COLLATE NOCASE, d.name COLLATE NOCASE`,
      )
      .all();
  }

  /** Erstellt ein Getränk und legt gleichzeitig den ersten Preis an. */
  create(input: CreateDrinkInput): DrinkRow {
    const result = this.db
      .prepare<{
        name: string;
        category_id: number;
      }>('INSERT INTO drinks (name, category_id) VALUES (@name, @category_id)')
      .run({ name: input.name, category_id: input.categoryId });

    const drinkId = result.lastInsertRowid as number;

    this.db
      .prepare('INSERT INTO drink_prices (drink_id, price_cents) VALUES (@drink_id, @price_cents)')
      .run({ drink_id: drinkId, price_cents: input.initialPriceCents });

    return this.findById(drinkId)!;
  }

  /**
   * Aktualisiert Name und/oder Verfügbarkeit eines Getränks.
   * Gibt das aktualisierte Getränk zurück (undefined wenn nicht gefunden).
   */
  update(
    id: number,
    input: { name?: string; is_available?: 0 | 1; category_id?: number },
  ): DrinkRow {
    const existing = this.findById(id);
    if (!existing) throw new Error(`Drink ${id} not found`);

    this.db
      .prepare(
        `UPDATE drinks
         SET name         = @name,
             is_available = @is_available,
             category_id  = @category_id
         WHERE id = @id`,
      )
      .run({
        id,
        name: input.name ?? existing.name,
        is_available: input.is_available ?? existing.is_available,
        category_id: input.category_id ?? existing.category_id,
      });

    return this.findById(id)!;
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
