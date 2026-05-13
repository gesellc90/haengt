import type { BookingsRepo, BookingWithDrinkName } from '../db/repos/BookingsRepo.js';
import type { MembersRepo } from '../db/repos/MembersRepo.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Öffentliche Typen
// ---------------------------------------------------------------------------

export interface DrinkSummary {
  drink_id: number;
  drink_name: string;
  count: number;
  total_cents: number;
}

export interface MonthlyReport {
  member_id: number;
  member_display_name: string;
  year: number;
  month: number;
  /** Einzelne Buchungen chronologisch aufsteigend */
  entries: BookingWithDrinkName[];
  /** Aggregiert pro Getränk, alphabetisch sortiert */
  summary: DrinkSummary[];
  grand_total_cents: number;
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Berechnet den halboffenen Zeitraum [from, to) für einen Kalendermonat in UTC.
 * Beispiel: year=2026, month=5 → from='2026-05-01T00:00:00.000Z', to='2026-06-01T00:00:00.000Z'
 */
export function monthBounds(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const from = `${year}-${pad(month)}-01T00:00:00.000Z`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const to = `${nextYear}-${pad(nextMonth)}-01T00:00:00.000Z`;
  return { from, to };
}

function buildSummary(entries: BookingWithDrinkName[]): DrinkSummary[] {
  const map = new Map<number, DrinkSummary>();
  for (const e of entries) {
    const existing = map.get(e.drink_id);
    if (existing) {
      existing.count++;
      existing.total_cents += e.price_cents;
    } else {
      map.set(e.drink_id, {
        drink_id: e.drink_id,
        drink_name: e.drink_name,
        count: 1,
        total_cents: e.price_cents,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.drink_name.localeCompare(b.drink_name, 'de'));
}

function toReport(
  memberId: number,
  displayName: string,
  year: number,
  month: number,
  entries: BookingWithDrinkName[],
): MonthlyReport {
  const summary = buildSummary(entries);
  const grand_total_cents = summary.reduce((acc, s) => acc + s.total_cents, 0);
  return {
    member_id: memberId,
    member_display_name: displayName,
    year,
    month,
    entries,
    summary,
    grand_total_cents,
  };
}

// ---------------------------------------------------------------------------
// ReportService
// ---------------------------------------------------------------------------

export class ReportService {
  constructor(
    private readonly bookings: BookingsRepo,
    private readonly members: MembersRepo,
  ) {}

  /**
   * Erstellt den Monatsbericht für ein einzelnes Mitglied.
   * Wirft AppError(404) wenn das Mitglied nicht existiert.
   */
  calculateMonthly(memberId: number, year: number, month: number): MonthlyReport {
    const member = this.members.findById(memberId);
    if (!member) throw new AppError('Mitglied nicht gefunden', 404, 'NOT_FOUND');

    const { from, to } = monthBounds(year, month);
    const entries = this.bookings.findWithDrinkName(memberId, from, to);
    return toReport(memberId, member.display_name, year, month, entries);
  }

  /**
   * Erstellt Monatsberichte für alle aktiven Mitglieder.
   * Mitglieder ohne Buchungen werden mit leerer Liste eingeschlossen.
   */
  calculateAllMembers(year: number, month: number): MonthlyReport[] {
    const { from, to } = monthBounds(year, month);
    const members = this.members.findAll(false); // nur aktive
    return members.map((m) => {
      const entries = this.bookings.findWithDrinkName(m.id, from, to);
      return toReport(m.id, m.display_name, year, month, entries);
    });
  }
}
