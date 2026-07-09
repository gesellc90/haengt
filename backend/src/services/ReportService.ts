import type { BookingsRepo, BookingWithDrinkName } from '../db/repos/BookingsRepo.js';
import type { MembersRepo } from '../db/repos/MembersRepo.js';
import type { ZeigerRepo } from '../db/repos/ZeigerRepo.js';
import type { VerbindungenRepo } from '../db/repos/VerbindungenRepo.js';
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

export interface ZeigerSummaryReport {
  zeiger_id: number;
  titel: string;
  art: 'veranstaltung' | 'besuch';
  verbindung_name: string | null;
  status: 'offen' | 'geschlossen';
  opened_at: string;
  closed_at: string | null;
  anzahl_bundesbrueder: number;
  anzahl_gaeste: number;
  entries: BookingWithDrinkName[];
  summary: DrinkSummary[];
  grand_total_cents: number;
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

/** Zeitzone, in der Abrechnungsmonate definiert sind (Vereinsstandort). */
const REPORT_TZ = 'Europe/Berlin';

/**
 * Offset (lokale Zeit − UTC) einer Zeitzone zum angegebenen Zeitpunkt, in ms.
 * Nutzt Intl statt einer TZ-Bibliothek – für Monatsgrenzen völlig ausreichend.
 */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  // Intl liefert 24 statt 0 für Mitternacht – normalisieren.
  const hour = parts['hour'] === 24 ? 0 : parts['hour']!;
  const asUtc = Date.UTC(
    parts['year']!,
    parts['month']! - 1,
    parts['day']!,
    hour,
    parts['minute']!,
    parts['second']!,
  );
  return asUtc - instant.getTime();
}

/**
 * Liefert den UTC-Zeitpunkt, der lokaler Mitternacht (00:00) am 1. des Monats
 * in `REPORT_TZ` entspricht. Zwei Iterationen fangen den DST-Offset korrekt ab
 * (an Monatsgrenzen finden ohnehin keine DST-Umstellungen statt).
 */
function monthStartUtc(year: number, month: number): string {
  const naiveUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offset1 = tzOffsetMs(new Date(naiveUtc), REPORT_TZ);
  let utc = naiveUtc - offset1;
  const offset2 = tzOffsetMs(new Date(utc), REPORT_TZ);
  if (offset2 !== offset1) utc = naiveUtc - offset2;
  return new Date(utc).toISOString();
}

/**
 * Berechnet den halboffenen Zeitraum [from, to) für einen Kalendermonat in der
 * Vereinszeitzone (Europe/Berlin), zurückgegeben als UTC-ISO-Strings.
 *
 * Wichtig: Die Buchungszeitstempel liegen in UTC vor, die Abrechnung soll aber
 * den lokalen Kalendermonat abbilden. Eine Buchung am 1. um 01:00 Berliner Zeit
 * (Sommerzeit) hat den UTC-Stempel `…-04-30T23:00Z` und muss dennoch in den Mai
 * fallen – genau das leistet die Zeitzonen-korrekte Grenze.
 */
export function monthBounds(year: number, month: number): { from: string; to: string } {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    from: monthStartUtc(year, month),
    to: monthStartUtc(nextYear, nextMonth),
  };
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
    private readonly zeiger: ZeigerRepo,
    private readonly verbindungen: VerbindungenRepo,
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

  /**
   * Zeiger-Auswertung für einen einzelnen Zeiger.
   * Wirft AppError(404) wenn der Zeiger nicht existiert.
   */
  calculateZeiger(zeigerId: number): ZeigerSummaryReport {
    const z = this.zeiger.findById(zeigerId);
    if (!z) throw new AppError('Zeiger nicht gefunden', 404, 'NOT_FOUND');

    const verbindung =
      z.verbindung_id !== null ? this.verbindungen.findById(z.verbindung_id) : undefined;

    const entries = this.bookings.findByZeigerWithDrinkName(zeigerId);
    const summary = buildSummary(entries);
    const grand_total_cents = summary.reduce((acc, s) => acc + s.total_cents, 0);

    return {
      zeiger_id: z.id,
      titel: z.titel,
      art: z.art,
      verbindung_name: verbindung?.name ?? null,
      status: z.status,
      opened_at: z.opened_at,
      closed_at: z.closed_at,
      anzahl_bundesbrueder: z.anzahl_bundesbrueder,
      anzahl_gaeste: z.anzahl_gaeste,
      entries,
      summary,
      grand_total_cents,
    };
  }

  /**
   * Zeiger-Auswertung für alle Zeiger, optional nach Zeitraum gefiltert.
   * `from`/`to` sind ISO-Datum-Strings (YYYY-MM-DD).
   */
  calculateAllZeiger(from?: string, to?: string): ZeigerSummaryReport[] {
    const all = this.zeiger.findAll();
    const filtered = all.filter((z) => {
      const date = z.opened_at.slice(0, 10);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });
    return filtered.map((z) => this.calculateZeiger(z.id));
  }
}
