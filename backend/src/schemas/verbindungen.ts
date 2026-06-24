import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /verbindungen
// ---------------------------------------------------------------------------

export const createVerbindungSchema = z.object({
  name: z.string().min(1, 'Name darf nicht leer sein').max(200, 'Maximal 200 Zeichen').trim(),
  zirkel: z.string().max(50, 'Maximal 50 Zeichen').trim().nullable().optional(),
  ort: z.string().max(200, 'Maximal 200 Zeichen').trim().nullable().optional(),
});

export type CreateVerbindungInput = z.infer<typeof createVerbindungSchema>;

// ---------------------------------------------------------------------------
// PATCH /verbindungen/:id
// ---------------------------------------------------------------------------

export const updateVerbindungSchema = z
  .object({
    name: z.string().min(1).max(200).trim().optional(),
    zirkel: z.string().max(50).trim().nullable().optional(),
    ort: z.string().max(200).trim().nullable().optional(),
    active: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type UpdateVerbindungInput = z.infer<typeof updateVerbindungSchema>;

// ---------------------------------------------------------------------------
// GET /verbindungen
// ---------------------------------------------------------------------------

export const listVerbindungenSchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
