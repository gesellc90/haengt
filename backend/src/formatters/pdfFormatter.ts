/**
 * PDF-Export für Monatsberichte via PDFKit.
 *
 * Enthält:
 *  - generatePdf(report): einzelner Mitgliedsbericht (eine Seite oder mehr)
 *  - generateAllMembersPdf(reports): Sammel-PDF mit Inhaltsverzeichnis
 *
 * Voraussetzung: `npm install pdfkit @types/pdfkit` im backend-Verzeichnis
 */

import PDFDocument from 'pdfkit';
import type {
  MonthlyReport,
  DrinkSummary,
  ZeigerSummaryReport,
  ConsumptionReport,
} from '../services/ReportService.js';

// ---------------------------------------------------------------------------
// Konstanten & Hilfsfunktionen
// ---------------------------------------------------------------------------

const FONT_NORMAL = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const PRIMARY_COLOR = '#1e40af'; // Blau
const LINE_COLOR = '#cbd5e1'; // Slate-300
const PAGE_OPTS = { size: 'A4' as const, margin: 50 };

/** Cents → lesbares Euro-Format, z. B. 123 → "1,23 €" */
function eur(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

/** ISO-Timestamp → deutsches Datum */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
}

/** ISO-Timestamp → Uhrzeit HH:MM */
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Layouthilfsfunktionen
// ---------------------------------------------------------------------------

function drawHRule(doc: PDFKit.PDFDocument, color = LINE_COLOR): void {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc
    .moveTo(left, doc.y)
    .lineTo(right, doc.y)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke()
    .strokeColor('#000000')
    .lineWidth(1);
  doc.moveDown(0.3);
}

/**
 * Einfache Tabelle ohne Library — zeichnet Header-Zeile + Datenzeilen.
 * `columns` enthält [label, width, align].
 * Gibt die Y-Position nach der letzten Zeile zurück.
 */
function drawTable(
  doc: PDFKit.PDFDocument,
  columns: Array<{ label: string; width: number; align?: 'left' | 'right' }>,
  rows: string[][],
  startY?: number,
): number {
  const left = doc.page.margins.left;
  const ROW_H = 16;
  const BOTTOM_MARGIN = doc.page.margins.bottom + 60;
  let y = startY ?? doc.y;

  // Header
  doc.font(FONT_BOLD).fontSize(9).fillColor(PRIMARY_COLOR);
  let x = left;
  for (const col of columns) {
    doc.text(col.label, x, y, { width: col.width, align: col.align ?? 'left', lineBreak: false });
    x += col.width;
  }
  y += ROW_H - 2;
  doc.moveTo(left, y).lineTo(x, y).strokeColor(PRIMARY_COLOR).lineWidth(0.8).stroke().lineWidth(1);
  y += 4;

  // Datenzeilen
  doc.font(FONT_NORMAL).fontSize(9).fillColor('#1e293b');
  for (const [rowIdx, rowData] of rows.entries()) {
    // Seitenumbruch wenn nötig
    if (y + ROW_H > doc.page.height - BOTTOM_MARGIN) {
      doc.addPage(PAGE_OPTS);
      y = doc.page.margins.top;
    }

    // Alternierend heller Hintergrund
    if (rowIdx % 2 === 0) {
      doc
        .rect(
          left,
          y - 2,
          columns.reduce((a, c) => a + c.width, 0),
          ROW_H,
        )
        .fill('#f8fafc')
        .fillColor('#1e293b');
    }

    x = left;
    for (const [colIdx, col] of columns.entries()) {
      doc.text(rowData[colIdx] ?? '', x, y, {
        width: col.width,
        align: col.align ?? 'left',
        lineBreak: false,
      });
      x += col.width;
    }
    y += ROW_H;
  }
  return y;
}

// ---------------------------------------------------------------------------
// Seitenaufbau pro Mitglied
// ---------------------------------------------------------------------------

function writeMemberPage(doc: PDFKit.PDFDocument, report: MonthlyReport): void {
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // -- Header -----------------------------------------------------------------
  doc
    .font(FONT_BOLD)
    .fontSize(18)
    .fillColor(PRIMARY_COLOR)
    .text('Getränkeabrechnung', left, doc.page.margins.top);
  doc.font(FONT_NORMAL).fontSize(12).fillColor('#334155').text(report.member_display_name);
  doc
    .font(FONT_NORMAL)
    .fontSize(10)
    .fillColor('#64748b')
    .text(monthLabel(report.year, report.month));
  doc.moveDown(0.5);
  drawHRule(doc);

  // -- Buchungstabelle --------------------------------------------------------
  doc.font(FONT_BOLD).fontSize(10).fillColor('#1e293b').text('Einzelbuchungen');
  doc.moveDown(0.3);

  if (report.entries.length === 0) {
    doc.font(FONT_NORMAL).fontSize(9).fillColor('#94a3b8').text('Keine Buchungen in diesem Monat.');
    doc.moveDown(1);
  } else {
    const colDatum = { label: 'Datum', width: 80 };
    const colUhrzeit = { label: 'Uhrzeit', width: 55 };
    const colGetraenk = { label: 'Getränk', width: contentWidth - 80 - 55 - 70 };
    const colBetrag = { label: 'Betrag', width: 70, align: 'right' as const };

    const rows = report.entries.map((e) => [
      fmtDate(e.booked_at),
      fmtTime(e.booked_at),
      e.drink_name,
      eur(e.price_cents),
    ]);

    const afterTableY = drawTable(doc, [colDatum, colUhrzeit, colGetraenk, colBetrag], rows);
    doc.y = afterTableY + 8;
  }

  drawHRule(doc);

  // -- Zusammenfassung --------------------------------------------------------
  doc.font(FONT_BOLD).fontSize(10).fillColor('#1e293b').text('Zusammenfassung');
  doc.moveDown(0.3);

  const colGetraenk = { label: 'Getränk', width: contentWidth - 60 - 90 };
  const colAnzahl = { label: 'Anzahl', width: 60, align: 'right' as const };
  const colGesamt = { label: 'Gesamt', width: 90, align: 'right' as const };

  const summaryRows: string[][] = report.summary.map((s: DrinkSummary) => [
    s.drink_name,
    String(s.count),
    eur(s.total_cents),
  ]);

  const afterSummaryY = drawTable(doc, [colGetraenk, colAnzahl, colGesamt], summaryRows);
  let y = afterSummaryY + 4;

  // Gesamtzeile
  const totalLineWidth = contentWidth;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.margins.left + totalLineWidth, y)
    .strokeColor(PRIMARY_COLOR)
    .lineWidth(1)
    .stroke()
    .lineWidth(1);
  y += 4;
  doc
    .font(FONT_BOLD)
    .fontSize(10)
    .fillColor(PRIMARY_COLOR)
    .text(`Gesamt: ${eur(report.grand_total_cents)}`, doc.page.margins.left, y, {
      width: contentWidth,
      align: 'right',
    });

  // -- Footer -----------------------------------------------------------------
  const footerY = doc.page.height - doc.page.margins.bottom - 20;
  doc
    .font(FONT_NORMAL)
    .fontSize(8)
    .fillColor('#94a3b8')
    .text(
      `Erstellt am ${new Date().toLocaleDateString('de-DE')} · Hängt! – Jeder Strich zählt!`,
      doc.page.margins.left,
      footerY,
      { width: contentWidth, align: 'center' },
    );
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/** Erzeugt ein einzelnes Mitglieds-PDF und gibt einen Buffer zurück. */
export function generatePdf(report: MonthlyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(PAGE_OPTS);
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writeMemberPage(doc, report);
    doc.end();
  });
}

/**
 * Erzeugt ein Sammel-PDF aller Mitglieder mit Inhaltsverzeichnis auf Seite 1.
 * Mitglieder ohne Buchungen werden mit einem Hinweis eingeschlossen.
 */
export function generateAllMembersPdf(reports: MonthlyReport[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(PAGE_OPTS);
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    if (reports.length === 0) {
      doc.font(FONT_NORMAL).fontSize(12).text('Keine aktiven Mitglieder gefunden.');
      doc.end();
      return;
    }

    const [first] = reports;

    // ---- Inhaltsverzeichnis --------------------------------------------------
    doc
      .font(FONT_BOLD)
      .fontSize(18)
      .fillColor(PRIMARY_COLOR)
      .text('Sammel-Abrechnung', left, doc.page.margins.top);
    doc
      .font(FONT_NORMAL)
      .fontSize(11)
      .fillColor('#334155')
      .text(monthLabel(first!.year, first!.month));
    doc.moveDown(0.5);
    drawHRule(doc);
    doc.font(FONT_BOLD).fontSize(10).fillColor('#1e293b').text('Inhaltsverzeichnis');
    doc.moveDown(0.4);

    reports.forEach((r, i) => {
      doc
        .font(FONT_NORMAL)
        .fontSize(9)
        .fillColor('#334155')
        .text(
          `${i + 2}.  ${r.member_display_name}  ···  ${eur(r.grand_total_cents)}`,
          left,
          undefined,
          { width: contentWidth },
        );
    });

    // Footer Seite 1
    const footerY = doc.page.height - doc.page.margins.bottom - 20;
    doc
      .font(FONT_NORMAL)
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        `Erstellt am ${new Date().toLocaleDateString('de-DE')} · Hängt! – Jeder Strich zählt!`,
        left,
        footerY,
        { width: contentWidth, align: 'center' },
      );

    // ---- Eine Seite pro Mitglied --------------------------------------------
    for (const report of reports) {
      doc.addPage(PAGE_OPTS);
      writeMemberPage(doc, report);
    }

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// Zeiger-PDF (einzelner Zeiger)
// ---------------------------------------------------------------------------

function writeZeigerPage(doc: PDFKit.PDFDocument, report: ZeigerSummaryReport): void {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const contentWidth = right - left;
  const artLabel = report.art === 'besuch' ? 'Couleurbesuch' : 'Veranstaltung';

  doc.rect(left, doc.y, contentWidth, 2).fill(PRIMARY_COLOR).fillColor('#000');
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(16).fillColor(PRIMARY_COLOR).text(report.titel, left);
  doc
    .font(FONT_NORMAL)
    .fontSize(10)
    .fillColor('#475569')
    .text(
      [
        artLabel,
        report.verbindung_name ?? null,
        `Eröffnet: ${fmtDate(report.opened_at)}`,
        report.closed_at ? `Geschlossen: ${fmtDate(report.closed_at)}` : 'Status: offen',
      ]
        .filter(Boolean)
        .join('  ·  '),
      left,
    );
  if (report.anzahl_bundesbrueder !== null || report.anzahl_gaeste !== null) {
    const parts: string[] = [];
    if (report.anzahl_bundesbrueder !== null)
      parts.push(`${report.anzahl_bundesbrueder} Bundesbrüder`);
    if (report.anzahl_gaeste !== null) parts.push(`${report.anzahl_gaeste} Gäste`);
    doc.text(parts.join('  ·  '), left);
  }
  doc.moveDown(0.5);
  drawHRule(doc, PRIMARY_COLOR);

  doc.font(FONT_BOLD).fontSize(10).fillColor('#000').text('Buchungen', left);
  doc.moveDown(0.3);
  drawTable(
    doc,
    [
      { label: 'Datum', width: 70 },
      { label: 'Uhrzeit', width: 50 },
      { label: 'Getränk', width: contentWidth - 230 },
      { label: 'Betrag', width: 80, align: 'right' },
    ],
    report.entries.length > 0
      ? report.entries.map((e) => [
          fmtDate(e.booked_at),
          fmtTime(e.booked_at),
          e.drink_name,
          eur(e.price_cents),
        ])
      : [['', '', '(keine Buchungen)', '']],
  );
  doc.moveDown(0.8);
  drawHRule(doc);

  doc.font(FONT_BOLD).fontSize(10).fillColor('#000').text('Zusammenfassung', left);
  doc.moveDown(0.3);
  drawTable(
    doc,
    [
      { label: 'Getränk', width: contentWidth - 200 },
      { label: 'Anzahl', width: 80, align: 'right' },
      { label: 'Gesamt', width: 100, align: 'right' },
    ],
    [
      ...report.summary.map((s) => [s.drink_name, String(s.count), eur(s.total_cents)]),
      ['Gesamt', String(report.entries.length), eur(report.grand_total_cents)],
    ],
  );
}

export function generateZeigerPdf(report: ZeigerSummaryReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(PAGE_OPTS);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    writeZeigerPage(doc, report);
    doc.end();
  });
}

export function generateAllZeigerPdf(reports: ZeigerSummaryReport[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(PAGE_OPTS);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentWidth = right - left;
    const totalCents = reports.reduce((s, r) => s + r.grand_total_cents, 0);

    doc.font(FONT_BOLD).fontSize(20).fillColor(PRIMARY_COLOR).text('Zeiger-Auswertung', left, 120);
    doc
      .font(FONT_NORMAL)
      .fontSize(12)
      .fillColor('#475569')
      .text(`${reports.length} Zeiger · Erstellt am ${new Date().toLocaleDateString('de-DE')}`);
    doc.moveDown(2);

    drawTable(
      doc,
      [
        { label: 'Titel', width: contentWidth - 260 },
        { label: 'Art', width: 100 },
        { label: 'Status', width: 70 },
        { label: 'Gesamt', width: 80, align: 'right' },
      ],
      [
        ...reports.map((r) => [
          r.titel,
          r.art === 'besuch' ? 'Couleurbesuch' : 'Veranstaltung',
          r.status === 'offen' ? 'Offen' : 'Geschlossen',
          eur(r.grand_total_cents),
        ]),
        ['Gesamt', '', '', eur(totalCents)],
      ],
    );

    for (const report of reports) {
      doc.addPage(PAGE_OPTS);
      writeZeigerPage(doc, report);
    }

    doc.end();
  });
}

// ---------------------------------------------------------------------------
// Verbrauchs-Auswertung (Zeitraum, nach Kategorie gruppiert)
// ---------------------------------------------------------------------------

/** ISO-Datum (YYYY-MM-DD) → deutsches Datum (13.05.2026). */
function fmtDateOnly(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export function generateConsumptionPdf(report: ConsumptionReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(PAGE_OPTS);
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // -- Header ---------------------------------------------------------------
    doc
      .font(FONT_BOLD)
      .fontSize(18)
      .fillColor(PRIMARY_COLOR)
      .text('Getränke-Verbrauch', left, doc.page.margins.top);
    doc
      .font(FONT_NORMAL)
      .fontSize(11)
      .fillColor('#334155')
      .text(`Zeitraum: ${fmtDateOnly(report.from)} – ${fmtDateOnly(report.to)}`);
    doc.moveDown(0.5);
    drawHRule(doc);

    const colGetraenk = { label: 'Getränk', width: contentWidth - 70 - 90 };
    const colAnzahl = { label: 'Anzahl', width: 70, align: 'right' as const };
    const colGesamt = { label: 'Gesamt', width: 90, align: 'right' as const };

    if (report.groups.length === 0) {
      doc
        .font(FONT_NORMAL)
        .fontSize(10)
        .fillColor('#94a3b8')
        .text('Keine Buchungen im gewählten Zeitraum.', left);
    }

    // -- Eine Tabelle je Kategorie -------------------------------------------
    for (const group of report.groups) {
      doc.font(FONT_BOLD).fontSize(11).fillColor('#1e293b').text(group.category_name, left);
      doc.moveDown(0.3);

      const rows = group.drinks.map((d) => [d.drink_name, String(d.count), eur(d.total_cents)]);
      rows.push([`Summe ${group.category_name}`, String(group.count), eur(group.total_cents)]);

      const afterY = drawTable(doc, [colGetraenk, colAnzahl, colGesamt], rows);
      doc.y = afterY + 12;
    }

    // -- Gesamtsumme ----------------------------------------------------------
    if (report.groups.length > 0) {
      drawHRule(doc, PRIMARY_COLOR);
      doc
        .font(FONT_BOLD)
        .fontSize(11)
        .fillColor(PRIMARY_COLOR)
        .text(
          `Gesamt: ${report.total_count} Getränke · ${eur(report.grand_total_cents)}`,
          left,
          doc.y,
          { width: contentWidth, align: 'right' },
        );
    }

    // -- Footer ---------------------------------------------------------------
    const footerY = doc.page.height - doc.page.margins.bottom - 20;
    doc
      .font(FONT_NORMAL)
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        `Erstellt am ${new Date().toLocaleDateString('de-DE')} · Hängt! – Jeder Strich zählt!`,
        left,
        footerY,
        { width: contentWidth, align: 'center' },
      );

    doc.end();
  });
}
