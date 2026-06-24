import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /bookings
// ---------------------------------------------------------------------------

export const createBookingSchema = z.object({
  drink_id: z.number().int('Muss eine ganze Zahl sein').min(1, 'Ungültige Getränke-ID'),
  // Optionales Ziel-Mitglied (Theken-/Allgemein-Konto). Ohne Angabe bucht der
  // eingeloggte Nutzer für sich selbst.
  member_id: z
    .number()
    .int('Muss eine ganze Zahl sein')
    .min(1, 'Ungültige Mitglieds-ID')
    .optional(),
  // Optionaler Zeiger: Buchung wird dem Zeiger-Tab zugeordnet statt der
  // persönlichen Abrechnung.
  zeiger_id: z.number().int('Muss eine ganze Zahl sein').min(1, 'Ungültige Zeiger-ID').optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ---------------------------------------------------------------------------
// POST /bookings/:id/void
// ---------------------------------------------------------------------------

export const voidBookingSchema = z.object({
  reason: z.string().max(255, 'Maximal 255 Zeichen').trim().optional(),
});

export type VoidBookingInput = z.infer<typeof voidBookingSchema>;

// ---------------------------------------------------------------------------
// GET /bookings (Admin-Filter)
// ---------------------------------------------------------------------------

export const bookingsFilterSchema = z.object({
  member_id: z.coerce.number().int().positive().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  include_voided: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type BookingsFilterInput = z.infer<typeof bookingsFilterSchema>;

// ---------------------------------------------------------------------------
// GET /bookings/me (Pagination)
// ---------------------------------------------------------------------------

export const myBookingsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  before: z.coerce.number().int().positive().optional(),
});

export type MyBookingsInput = z.infer<typeof myBookingsSchema>;
