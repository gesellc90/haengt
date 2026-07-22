import type {
  DrinkCategoriesRepo,
  CreateDrinkCategoryInput,
  UpdateDrinkCategoryInput,
} from '../db/repos/DrinkCategoriesRepo.js';
import type { AuditLogRepo } from '../db/repos/AuditLogRepo.js';
import type { DrinkCategoryRow } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// DrinkCategoriesService — Business-Logik für Getränke-Kategorien
//
// Kategorien werden vom Admin gepflegt und bestimmen Gruppierung und
// Anzeige-Reihenfolge der Getränke. Löschen ist nur erlaubt, wenn der Kategorie
// keine Getränke mehr zugeordnet sind (409 CONFLICT sonst).
// ---------------------------------------------------------------------------

export class DrinkCategoriesService {
  constructor(
    private readonly categories: DrinkCategoriesRepo,
    private readonly auditLog: AuditLogRepo,
  ) {}

  findAll(): DrinkCategoryRow[] {
    return this.categories.findAll();
  }

  findById(id: number): DrinkCategoryRow {
    const category = this.categories.findById(id);
    if (!category) throw new AppError('Kategorie nicht gefunden', 404, 'NOT_FOUND');
    return category;
  }

  create(input: CreateDrinkCategoryInput, actorId: number): DrinkCategoryRow {
    if (this.categories.findByName(input.name)) {
      throw new AppError('Eine Kategorie mit diesem Namen existiert bereits', 409, 'CONFLICT');
    }

    const row = this.categories.create(input);

    this.auditLog.create({
      event_type: 'drink_category_created',
      actor_id: actorId,
      target_type: 'drink_category',
      target_id: row.id,
      meta: { name: row.name, sort_order: row.sort_order },
    });

    return row;
  }

  update(id: number, input: UpdateDrinkCategoryInput, actorId: number): DrinkCategoryRow {
    const existing = this.categories.findById(id);
    if (!existing) throw new AppError('Kategorie nicht gefunden', 404, 'NOT_FOUND');

    if (input.name !== undefined) {
      const clash = this.categories.findByName(input.name);
      if (clash && clash.id !== id) {
        throw new AppError('Eine Kategorie mit diesem Namen existiert bereits', 409, 'CONFLICT');
      }
    }

    const updated = this.categories.update(id, input)!;

    this.auditLog.create({
      event_type: 'drink_category_updated',
      actor_id: actorId,
      target_type: 'drink_category',
      target_id: id,
      meta: { changed_fields: Object.keys(input) },
    });

    return updated;
  }

  remove(id: number, actorId: number): void {
    const existing = this.categories.findById(id);
    if (!existing) throw new AppError('Kategorie nicht gefunden', 404, 'NOT_FOUND');

    const drinkCount = this.categories.countDrinks(id);
    if (drinkCount > 0) {
      throw new AppError(
        `Kategorie kann nicht gelöscht werden: ${drinkCount} Getränk(e) sind noch zugeordnet.`,
        409,
        'CATEGORY_NOT_EMPTY',
      );
    }

    this.categories.delete(id);

    this.auditLog.create({
      event_type: 'drink_category_deleted',
      actor_id: actorId,
      target_type: 'drink_category',
      target_id: id,
      meta: { name: existing.name },
    });
  }

  /**
   * Setzt die Anzeige-Reihenfolge neu. `orderedIds` muss GENAU die Menge aller
   * vorhandenen Kategorie-IDs enthalten (keine fehlenden, keine unbekannten),
   * damit keine Kategorie ohne definierte Position zurückbleibt.
   */
  reorder(orderedIds: number[], actorId: number): DrinkCategoryRow[] {
    const all = this.categories.findAll();
    const existingIds = new Set(all.map((c) => c.id));

    if (orderedIds.length !== existingIds.size) {
      throw new AppError(
        'Die Reihenfolge muss alle Kategorien genau einmal enthalten',
        400,
        'INVALID_ORDER',
      );
    }
    const seen = new Set<number>();
    for (const id of orderedIds) {
      if (!existingIds.has(id) || seen.has(id)) {
        throw new AppError(
          'Die Reihenfolge muss alle Kategorien genau einmal enthalten',
          400,
          'INVALID_ORDER',
        );
      }
      seen.add(id);
    }

    this.categories.reorder(orderedIds);

    this.auditLog.create({
      event_type: 'drink_categories_reordered',
      actor_id: actorId,
      target_type: 'drink_category',
      target_id: null,
      meta: { order: orderedIds },
    });

    return this.categories.findAll();
  }
}
