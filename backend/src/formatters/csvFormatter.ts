/**
 * CSV-Export für Monatsberichte.
 *
 * Format:
 *  - Kodierung: UTF-8 mit BOM (Excel-kompatibel)
 *  - Trennzeichen: Semikolon
 *  - Dezimaltrennzeichen: Komma (deutsch)
 *  - Zeilenende: CRLF
 */

import type { MonthlyReport } from '../services/ReportService.js';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

const CRLF = '\r\n';
const SEP = ';';

/** Cents → deutsches Euroformat, z. B. 123 → "1,23" */
function eur(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** ISO-Timestamp → deutsches Datum, z. B. "2026-05-13T14:30:00.000Z" → "13.05.2026" */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
}

/** ISO-Timestamp → Uhrzeit, z. B. "2026-05-13T14:30:00.000Z" → "14:30" */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

/** Zelleninhalt escapen: enthält der Wert SEP oder Anführungszeichen → in "" einwickeln */
function cell(value: string | number): string {
  const s = String(value);
  if (s.includes(SEP) || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(...cells: (string | number)[]): string {
  return cells.map(cell).join(SEP);
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Erzeugt den CSV-Buffer für einen Monatsbericht.
 * Enthält Einzelbuchungen + Zusammenfassung pro Getränk.
 */
export function generateCsv(report: MonthlyReport): Buffer {
  const MONTH_NAME = new Date(report.year, report.month - 1, 1).toLocaleString('de-DE', {
    month: 'long',
  });

  const lines: string[] = [];

  // ---- Titelzeile -----------------------------------------------------------
  lines.push(
    row(`Getränkeabrechnung – ${report.member_display_name} – ${MONTH_NAME} ${report.year}`),
  );
  lines.push('');

  // ---- Einzelbuchungen ------------------------------------------------------
  lines.push(row('Datum', 'Uhrzeit', 'Getränk', 'Betrag (€)'));
  for (const e of report.entries) {
    lines.push(row(fmtDate(e.booked_at), fmtTime(e.booked_at), e.drink_name, eur(e.price_cents)));
  }
  if (report.entries.length === 0) {
    lines.push(row('(keine Buchungen in diesem Monat)'));
  }
  lines.push('');

  // ---- Zusammenfassung pro Getränk ------------------------------------------
  lines.push(row('Zusammenfassung'));
  lines.push(row('Getränk', 'Anzahl', 'Gesamt (€)'));
  for (const s of report.summary) {
    lines.push(row(s.drink_name, s.count, eur(s.total_cents)));
  }
  lines.push(row('Gesamt', report.entries.length, eur(report.grand_total_cents)));
  lines.push('');
  lines.push(row(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`));

  // BOM + CRLF-Zeilenenden
  return Buffer.from('﻿' + lines.join(CRLF), 'utf-8');
}
