import { z } from 'zod';

const currentYear = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Basisschema für Jahr + Monat (wird von beiden Endpunkten verwendet)
// ---------------------------------------------------------------------------

const yearMonthSchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, 'year muss vierstellig sein')
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(2020)
        .max(currentYear + 1),
    ),
  month: z
    .string()
    .regex(/^(1[0-2]|[1-9])$/, 'month muss zwischen 1 und 12 liegen')
    .transform(Number)
    .pipe(z.number().int().min(1).max(12)),
});

// ---------------------------------------------------------------------------
// GET /reports/monthly?memberId=&year=&month=&format=
// ---------------------------------------------------------------------------

export const monthlyReportQuerySchema = yearMonthSchema.extend({
  memberId: z
    .string()
    .regex(/^\d+$/, 'memberId muss eine positive Ganzzahl sein')
    .transform(Number)
    .pipe(z.number().int().positive()),
  format: z.enum(['csv', 'pdf']),
});

export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;

// ---------------------------------------------------------------------------
// GET /reports/all?year=&month=&format=
// ---------------------------------------------------------------------------

export const allMembersReportQuerySchema = yearMonthSchema.extend({
  format: z.enum(['pdf']), // CSV für alle Mitglieder wird (noch) nicht unterstützt
});

export type AllMembersReportQuery = z.infer<typeof allMembersReportQuerySchema>;

// ---------------------------------------------------------------------------
// GET /reports/zeiger/:id?format=
// ---------------------------------------------------------------------------

export const zeigerReportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']),
});

export type ZeigerReportQuery = z.infer<typeof zeigerReportQuerySchema>;

// ---------------------------------------------------------------------------
// GET /reports/zeiger?from=&to=&format=
// ---------------------------------------------------------------------------

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Muss im Format YYYY-MM-DD sein')
  .optional();

export const allZeigerReportQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  format: z.enum(['csv', 'pdf']),
});

export type AllZeigerReportQuery = z.infer<typeof allZeigerReportQuerySchema>;
