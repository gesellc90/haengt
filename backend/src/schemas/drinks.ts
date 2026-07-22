import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /drinks
// ---------------------------------------------------------------------------

export const createDrinkSchema = z.object({
  name: z.string().min(1, 'Darf nicht leer sein').max(100, 'Maximal 100 Zeichen').trim(),
  /** Pflicht-Kategorie (ID einer bestehenden Kategorie). */
  category_id: z
    .number()
    .int('Muss eine ganze Zahl sein')
    .positive('Kategorie ist ein Pflichtfeld'),
  /** Initialpreis in Cent (≥ 0, z. B. 150 = 1,50 €) */
  price_cents: z
    .number()
    .int('Muss eine ganze Zahl sein')
    .min(0, 'Preis darf nicht negativ sein')
    .max(100_000, 'Preis unrealistisch hoch'),
});

export type CreateDrinkInput = z.infer<typeof createDrinkSchema>;

// ---------------------------------------------------------------------------
// PATCH /drinks/:id
// ---------------------------------------------------------------------------

export const updateDrinkSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Darf nicht leer sein')
      .max(100, 'Maximal 100 Zeichen')
      .trim()
      .optional(),
    is_available: z.literal(0).or(z.literal(1)).optional(),
    category_id: z
      .number()
      .int('Muss eine ganze Zahl sein')
      .positive('Ungültige Kategorie')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type UpdateDrinkInput = z.infer<typeof updateDrinkSchema>;

// ---------------------------------------------------------------------------
// POST /drinks/:id/prices
// ---------------------------------------------------------------------------

export const addPriceSchema = z.object({
  price_cents: z
    .number()
    .int('Muss eine ganze Zahl sein')
    .min(0, 'Preis darf nicht negativ sein')
    .max(100_000, 'Preis unrealistisch hoch'),
  /**
   * Optionaler Gültigkeitsbeginn als ISO-8601-String.
   * Fehlt er, gilt der Preis ab sofort.
   */
  valid_from: z
    .string()
    .datetime({ offset: true, message: 'Muss ein gültiger ISO-8601-Datetime sein' })
    .optional(),
});

export type AddPriceInput = z.infer<typeof addPriceSchema>;
