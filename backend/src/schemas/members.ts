import { z } from 'zod';

/** Korporationsstatus – siehe Migration 007. */
export const memberStatusSchema = z.enum(['aktiv', 'inaktiv', 'alter_herr', 'freund']);

// ---------------------------------------------------------------------------
// POST /members
// ---------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .trim()
  .email('Ungültige E-Mail-Adresse')
  .max(254, 'Maximal 254 Zeichen')
  .transform((v) => v.toLowerCase());

export const createMemberSchema = z.object({
  username: z
    .string()
    .min(2, 'Mindestens 2 Zeichen')
    .max(50, 'Maximal 50 Zeichen')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Nur Buchstaben, Ziffern, Punkt, Underscore und Bindestrich'),
  display_name: z.string().min(1, 'Darf nicht leer sein').max(100, 'Maximal 100 Zeichen').trim(),
  password: z.string().min(8, 'Mindestens 8 Zeichen').max(72, 'Maximal 72 Zeichen (bcrypt-Limit)'),
  role: z.enum(['admin', 'member']).default('member'),
  member_status: memberStatusSchema.default('aktiv'),
  email: emailSchema.optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

// ---------------------------------------------------------------------------
// PATCH /members/:id
// ---------------------------------------------------------------------------

export const updateMemberSchema = z
  .object({
    display_name: z
      .string()
      .min(1, 'Darf nicht leer sein')
      .max(100, 'Maximal 100 Zeichen')
      .trim()
      .optional(),
    password: z
      .string()
      .min(8, 'Mindestens 8 Zeichen')
      .max(72, 'Maximal 72 Zeichen (bcrypt-Limit)')
      .optional(),
    role: z.enum(['admin', 'member']).optional(),
    member_status: memberStatusSchema.optional(),
    can_book_for_others: z.boolean().optional(),
    email: emailSchema.nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
