/**
 * Unit-Tests für den CSV-Formatter – Fokus auf CSV-Formel-Injektion.
 *
 * Eigenständige Zellen (z. B. Getränkenamen in der Zusammenfassung) dürfen in
 * Excel/LibreOffice NICHT als Formel interpretiert werden. Ein Wert wie
 * `=HYPERLINK(...)` muss neutralisiert werden (führendes ' voranstellen).
 */

import { describe, it, expect } from 'vitest';
import { generateCsv } from '../../../src/formatters/csvFormatter.js';
import type { MonthlyReport } from '../../../src/services/ReportService.js';

/** Report mit genau einer Summary-Zeile, deren Getränkename `name` ist. */
function reportWithDrinkName(name: string): MonthlyReport {
  return {
    member_id: 1,
    member_display_name: 'Anna Muster',
    year: 2026,
    month: 5,
    entries: [
      {
        booking_id: 1,
        booked_at: '2026-05-10T12:00:00.000Z',
        drink_id: 1,
        drink_name: name,
        price_cents: 100,
      },
    ],
    summary: [{ drink_id: 1, drink_name: name, count: 1, total_cents: 100 }],
    grand_total_cents: 100,
  };
}

describe('generateCsv – Formel-Injektion', () => {
  it('neutralisiert eine mit = beginnende Zelle', () => {
    const csv = generateCsv(reportWithDrinkName('=HYPERLINK("http://evil","x")')).toString('utf-8');
    // Der Wert wird mit ' vorangestellt und (wegen des enthaltenen "") in "" gewrappt.
    expect(csv).toContain(`"'=HYPERLINK`);
    // Keine Zelle beginnt (nach Zeilenanfang oder ;) direkt mit =.
    expect(csv).not.toMatch(/(^|;)=HYPERLINK/m);
  });

  it('neutralisiert führende +, - und @', () => {
    for (const prefix of ['+', '-', '@']) {
      const csv = generateCsv(reportWithDrinkName(`${prefix}cmd`)).toString('utf-8');
      expect(csv).toContain(`'${prefix}cmd`);
    }
  });

  it('lässt harmlose Namen unverändert', () => {
    const csv = generateCsv(reportWithDrinkName('Cola')).toString('utf-8');
    expect(csv).toContain('Cola');
    expect(csv).not.toContain(`'Cola`);
  });
});
