import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /zeiger — Zeiger anlegen
// ---------------------------------------------------------------------------

export const createZeigerSchema = z.object({
  titel: z.string().min(1, 'Titel darf nicht leer sein').max(200, 'Maximal 200 Zeichen').trim(),
  art: z.enum(['veranstaltung', 'besuch']),
  verbindung_id: z.number().int().positive().nullable().optional(),
  anzahl_bundesbrueder: z.number().int().min(0).optional(),
  anzahl_gaeste: z.number().int().min(0).optional(),
});

export type CreateZeigerInput = z.infer<typeof createZeigerSchema>;

// ---------------------------------------------------------------------------
// PATCH /zeiger/:id — Teilaktualisierung (BBr/Gäste)
// ---------------------------------------------------------------------------

export const updateZeigerSchema = z
  .object({
    anzahl_bundesbrueder: z.number().int().min(0).optional(),
    anzahl_gaeste: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type UpdateZeigerInput = z.infer<typeof updateZeigerSchema>;

// ---------------------------------------------------------------------------
// POST /zeiger/:id/close — Zeiger schließen
// ---------------------------------------------------------------------------

export const closeZeigerSchema = z.object({
  anzahl_bundesbrueder: z.number().int().min(0).optional(),
  anzahl_gaeste: z.number().int().min(0).optional(),
});

export type CloseZeigerInput = z.infer<typeof closeZeigerSchema>;

// ---------------------------------------------------------------------------
// GET /zeiger — Filter
// ---------------------------------------------------------------------------

export const listZeigerSchema = z.object({
  status: z.enum(['offen', 'geschlossen']).optional(),
});

export type ListZeigerInput = z.infer<typeof listZeigerSchema>;
