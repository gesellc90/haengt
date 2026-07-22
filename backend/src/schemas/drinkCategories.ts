import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /drink-categories
// ---------------------------------------------------------------------------

export const createDrinkCategorySchema = z.object({
  name: z.string().min(1, 'Darf nicht leer sein').max(60, 'Maximal 60 Zeichen').trim(),
});

export type CreateDrinkCategoryInput = z.infer<typeof createDrinkCategorySchema>;

// ---------------------------------------------------------------------------
// PATCH /drink-categories/:id
// ---------------------------------------------------------------------------

export const updateDrinkCategorySchema = z
  .object({
    name: z.string().min(1, 'Darf nicht leer sein').max(60, 'Maximal 60 Zeichen').trim().optional(),
    sort_order: z.number().int('Muss eine ganze Zahl sein').min(0).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type UpdateDrinkCategoryInput = z.infer<typeof updateDrinkCategorySchema>;

// ---------------------------------------------------------------------------
// PUT /drink-categories/order
// ---------------------------------------------------------------------------

export const reorderDrinkCategoriesSchema = z.object({
  /** Kategorie-IDs in der gewünschten Reihenfolge (alle vorhandenen genau einmal). */
  ordered_ids: z.array(z.number().int().positive()).min(1, 'Mindestens eine Kategorie erwartet'),
});

export type ReorderDrinkCategoriesInput = z.infer<typeof reorderDrinkCategoriesSchema>;
