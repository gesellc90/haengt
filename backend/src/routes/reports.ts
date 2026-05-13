import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { monthlyReportQuerySchema, allMembersReportQuerySchema } from '../schemas/reports.js';
import type { AuthService } from '../services/AuthService.js';
import type { ReportService } from '../services/ReportService.js';
import { generateCsv } from '../formatters/csvFormatter.js';
import { generatePdf, generateAllMembersPdf } from '../formatters/pdfFormatter.js';

// ---------------------------------------------------------------------------
// Reports-Router (alle Endpunkte Admin-only)
// ---------------------------------------------------------------------------

export function createReportsRouter(
  authService: AuthService,
  reportService: ReportService,
): Router {
  const router = Router();
  const auth = authenticate(authService);
  const admin = requireRole('admin');

  // -------------------------------------------------------------------------
  // GET /reports/monthly?memberId=&year=&month=&format=csv|pdf
  //
  // Liefert den Monatsbericht eines einzelnen Mitglieds als CSV oder PDF.
  // -------------------------------------------------------------------------
  router.get('/monthly', auth, admin, async (req, res, next) => {
    const parsed = monthlyReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Parameter', details: parsed.error.flatten() });
      return;
    }

    try {
      const { memberId, year, month, format } = parsed.data;
      const report = reportService.calculateMonthly(memberId, year, month);

      const monthStr = String(month).padStart(2, '0');
      const baseName = `abrechnung_${report.member_display_name.replace(/\s+/g, '_')}_${year}-${monthStr}`;

      if (format === 'csv') {
        const buffer = generateCsv(report);
        res
          .status(200)
          .setHeader('Content-Type', 'text/csv; charset=utf-8')
          .setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`)
          .send(buffer);
        return;
      }

      // format === 'pdf'
      const buffer = await generatePdf(report);
      res
        .status(200)
        .setHeader('Content-Type', 'application/pdf')
        .setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`)
        .send(buffer);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // GET /reports/all?year=&month=&format=pdf
  //
  // Sammel-PDF aller aktiven Mitglieder mit Inhaltsverzeichnis.
  // -------------------------------------------------------------------------
  router.get('/all', auth, admin, async (req, res, next) => {
    const parsed = allMembersReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Parameter', details: parsed.error.flatten() });
      return;
    }

    try {
      const { year, month } = parsed.data;
      const reports = reportService.calculateAllMembers(year, month);

      const monthStr = String(month).padStart(2, '0');
      const baseName = `sammel_abrechnung_${year}-${monthStr}`;

      const buffer = await generateAllMembersPdf(reports);
      res
        .status(200)
        .setHeader('Content-Type', 'application/pdf')
        .setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`)
        .send(buffer);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
