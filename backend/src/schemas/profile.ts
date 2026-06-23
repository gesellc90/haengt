import { z } from 'zod';
import { emailSchema } from './members.js';

// ---------------------------------------------------------------------------
// PATCH /auth/me — Selbstauskunft (eingeloggtes Mitglied)
// ---------------------------------------------------------------------------

export const updateSelfSchema = z
  .object({
    display_name: z
      .string()
      .min(1, 'Darf nicht leer sein')
      .max(100, 'Maximal 100 Zeichen')
      .trim()
      .optional(),
    email: emailSchema.nullable().optional(),
    password: z
      .string()
      .min(8, 'Mindestens 8 Zeichen')
      .max(72, 'Maximal 72 Zeichen (bcrypt-Limit)')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type UpdateSelfInput = z.infer<typeof updateSelfSchema>;
