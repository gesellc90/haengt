import type { Db } from '../client.js';
import type { DrinkCategoryRow } from '../types.js';

export interface CreateDrinkCategoryInput {
  name: string;
  /** Optional; fehlt sie, wird die Kategorie ans Ende einsortiert. */
  sort_order?: number;
}

export interface UpdateDrinkCategoryInput {
  name?: string;
  sort_order?: number;
}

// ---------------------------------------------------------------------------
// DrinkCategoriesRepo — Stammdaten der Getränke-Kategorien
//
// Sortierung durchgängig nach (sort_order, name COLLATE NOCASE), damit die
// Anzeige-Reihenfolge exakt der Admin-Vorgabe entspricht.
// ---------------------------------------------------------------------------

export class DrinkCategoriesRepo {
  constructor(private readonly db: Db) {}

  findById(id: number): DrinkCategoryRow | undefined {
    return this.db
      .prepare<[number], DrinkCategoryRow>('SELECT * FROM drink_categories WHERE id = ?')
      .get(id);
  }

  findByName(name: string): DrinkCategoryRow | undefined {
    return this.db
      .prepare<
        [string],
        DrinkCategoryRow
      >('SELECT * FROM drink_categories WHERE name = ? COLLATE NOCASE')
      .get(name);
  }

  findAll(): DrinkCategoryRow[] {
    return this.db
      .prepare<
        [],
        DrinkCategoryRow
      >('SELECT * FROM drink_categories ORDER BY sort_order, name COLLATE NOCASE')
      .all();
  }

  /** Anzahl der einer Kategorie zugeordneten Getränke (inkl. deaktivierter). */
  countDrinks(categoryId: number): number {
    const row = this.db
      .prepare<
        [number],
        { cnt: number }
      >('SELECT COUNT(*) AS cnt FROM drinks WHERE category_id = ?')
      .get(categoryId);
    return row?.cnt ?? 0;
  }

  create(input: CreateDrinkCategoryInput): DrinkCategoryRow {
    // Ohne explizite Reihenfolge ans Ende einsortieren.
    const sortOrder =
      input.sort_order ??
      (
        this.db
          .prepare<
            [],
            { next: number }
          >('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM drink_categories')
          .get() as { next: number }
      ).next;

    const result = this.db
      .prepare('INSERT INTO drink_categories (name, sort_order) VALUES (@name, @sort_order)')
      .run({ name: input.name, sort_order: sortOrder });

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: UpdateDrinkCategoryInput): DrinkCategoryRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    this.db
      .prepare(
        `UPDATE drink_categories
         SET name       = @name,
             sort_order = @sort_order
         WHERE id = @id`,
      )
      .run({
        id,
        name: input.name ?? existing.name,
        sort_order: input.sort_order ?? existing.sort_order,
      });

    return this.findById(id);
  }

  /**
   * Löscht eine Kategorie. Schlägt fehl (ON DELETE RESTRICT), wenn ihr noch
   * Getränke zugeordnet sind – das prüft zusätzlich der Service vorab.
   */
  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM drink_categories WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Schreibt die Reihenfolge neu: Position im Array → sort_order (0-basiert).
   * Läuft in einer Transaktion, damit die Reihenfolge konsistent bleibt.
   */
  reorder(orderedIds: number[]): void {
    const stmt = this.db.prepare('UPDATE drink_categories SET sort_order = @order WHERE id = @id');
    this.db.transaction(() => {
      orderedIds.forEach((id, index) => {
        stmt.run({ id, order: index });
      });
    })();
  }
}
