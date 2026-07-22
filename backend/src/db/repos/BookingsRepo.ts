import type { Db } from '../client.js';
import type { BookingRow } from '../types.js';

// ---------------------------------------------------------------------------
// Report-spezifischer Typ (JOIN mit drinks)
// ---------------------------------------------------------------------------

export interface BookingWithDrinkName {
  booking_id: number;
  booked_at: string;
  drink_id: number;
  drink_name: string;
  price_cents: number;
}

/** Einzelbuchung für die Verbrauchs-Auswertung (inkl. Kategorie). */
export interface ConsumptionEntry {
  drink_id: number;
  drink_name: string;
  category_id: number;
  category_name: string;
  category_sort_order: number;
  price_cents: number;
}

export interface CreateBookingInput {
  member_id: number;
  drink_id: number;
  price_cents_snapshot: number;
  /** Wer die Buchung ausgelöst hat; NULL = Selbstbuchung. */
  booked_by_id?: number | null;
  /** Zeiger, auf den die Buchung geht; NULL = Personenbuchung. */
  zeiger_id?: number | null;
}

export interface BookingFilter {
  memberId?: number;
  /** ISO-Datum-String (inklusiv) */
  fromDate?: string;
  /** ISO-Datum-String (inklusiv) */
  toDate?: string;
  /** Wenn true, werden auch stornierte Buchungen zurückgegeben */
  includeVoided?: boolean;
}

export interface PaginatedBookings {
  items: BookingRow[];
  hasMore: boolean;
}

export class BookingsRepo {
  constructor(private readonly db: Db) {}

  findById(id: number): BookingRow | undefined {
    return this.db.prepare<[number], BookingRow>('SELECT * FROM bookings WHERE id = ?').get(id);
  }

  /**
   * Paginierte Liste persönlicher Buchungen eines Mitglieds (Cursor-basiert über `beforeId`).
   * Zeiger-Buchungen (zeiger_id IS NOT NULL) werden ausgeschlossen – sie erscheinen
   * ausschließlich im Zeiger-Report, nicht in der persönlichen Übersicht.
   * Reihenfolge: neueste zuerst.
   */
  findByMember(memberId: number, limit = 50, beforeId?: number): PaginatedBookings {
    const params: unknown[] = [memberId];
    let sql = `
      SELECT * FROM bookings
      WHERE member_id = ?
        AND voided_at IS NULL
        AND zeiger_id IS NULL
    `;

    if (beforeId !== undefined) {
      sql += ' AND id < ?';
      params.push(beforeId);
    }

    sql += ' ORDER BY booked_at DESC, id DESC LIMIT ?';
    params.push(limit + 1); // +1 um hasMore zu erkennen

    const rows = this.db.prepare<unknown[], BookingRow>(sql).all(...params);
    const hasMore = rows.length > limit;

    return { items: rows.slice(0, limit), hasMore };
  }

  /** Alle Buchungen eines Zeigers (inkl. stornierter wenn gewünscht). */
  findByZeiger(zeigerId: number, includeVoided = false): BookingRow[] {
    const sql = includeVoided
      ? 'SELECT * FROM bookings WHERE zeiger_id = ? ORDER BY booked_at ASC, id ASC'
      : 'SELECT * FROM bookings WHERE zeiger_id = ? AND voided_at IS NULL ORDER BY booked_at ASC, id ASC';
    return this.db.prepare<[number], BookingRow>(sql).all(zeigerId);
  }

  findByZeigerWithDrinkName(zeigerId: number): BookingWithDrinkName[] {
    return this.db
      .prepare<[number], BookingWithDrinkName>(
        `SELECT b.id                   AS booking_id,
                b.booked_at,
                b.drink_id,
                d.name                 AS drink_name,
                b.price_cents_snapshot AS price_cents
         FROM bookings b
         JOIN drinks d ON d.id = b.drink_id
         WHERE b.zeiger_id = ?
           AND b.voided_at IS NULL
         ORDER BY b.booked_at ASC, b.id ASC`,
      )
      .all(zeigerId);
  }

  /** Admin-Filter-Abfrage mit optionalen Filtern. */
  findMany(filter: BookingFilter = {}, limit = 100): BookingRow[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.memberId !== undefined) {
      conditions.push('member_id = ?');
      params.push(filter.memberId);
    }
    if (!filter.includeVoided) {
      conditions.push('voided_at IS NULL');
    }
    if (filter.fromDate) {
      conditions.push('booked_at >= ?');
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push('booked_at <= ?');
      params.push(filter.toDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);
    return this.db
      .prepare<
        unknown[],
        BookingRow
      >(`SELECT * FROM bookings ${where} ORDER BY booked_at DESC, id DESC LIMIT ?`)
      .all(...params);
  }

  create(input: CreateBookingInput): BookingRow {
    const result = this.db
      .prepare(
        `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_by_id, zeiger_id)
         VALUES (@member_id, @drink_id, @price_cents_snapshot, @booked_by_id, @zeiger_id)`,
      )
      .run({
        member_id: input.member_id,
        drink_id: input.drink_id,
        price_cents_snapshot: input.price_cents_snapshot,
        booked_by_id: input.booked_by_id ?? null,
        zeiger_id: input.zeiger_id ?? null,
      });

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * Storniert eine Buchung.
   * Gibt `false` zurück, wenn sie nicht existiert oder bereits storniert ist.
   */
  void(id: number, reason?: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE bookings
         SET voided_at   = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             void_reason = @reason
         WHERE id = @id AND voided_at IS NULL`,
      )
      .run({ id, reason: reason ?? null });

    return result.changes > 0;
  }

  /**
   * Gibt alle nicht-storni­erten Buchungen eines Mitglieds in einem halboffenen
   * Zeitraum [fromDate, toDate) zurück, angereichert mit dem Getränkenamen.
   * Wird ausschließlich vom ReportService verwendet.
   */
  /**
   * Alle nicht-stornierten Buchungen im halboffenen Zeitraum [fromDate, toDate),
   * angereichert mit Getränke- und Kategorie-Info. Für die Verbrauchs-Auswertung:
   * enthält BEWUSST sowohl Personen- als auch Zeiger-Buchungen (Gesamtverbrauch).
   */
  findConsumption(fromDate: string, toDate: string): ConsumptionEntry[] {
    return this.db
      .prepare<[string, string], ConsumptionEntry>(
        `SELECT b.drink_id,
                d.name                 AS drink_name,
                c.id                   AS category_id,
                c.name                 AS category_name,
                c.sort_order           AS category_sort_order,
                b.price_cents_snapshot AS price_cents
         FROM bookings b
         JOIN drinks d           ON d.id = b.drink_id
         JOIN drink_categories c ON c.id = d.category_id
         WHERE b.booked_at >= ?
           AND b.booked_at <  ?
           AND b.voided_at IS NULL
         ORDER BY c.sort_order, c.name COLLATE NOCASE, d.name COLLATE NOCASE`,
      )
      .all(fromDate, toDate);
  }

  findWithDrinkName(memberId: number, fromDate: string, toDate: string): BookingWithDrinkName[] {
    return this.db
      .prepare<[number, string, string], BookingWithDrinkName>(
        `SELECT b.id                   AS booking_id,
                b.booked_at,
                b.drink_id,
                d.name                 AS drink_name,
                b.price_cents_snapshot AS price_cents
         FROM bookings b
         JOIN drinks d ON d.id = b.drink_id
         WHERE b.member_id = ?
           AND b.booked_at >= ?
           AND b.booked_at <  ?
           AND b.voided_at IS NULL
           AND b.zeiger_id IS NULL
         ORDER BY b.booked_at ASC, b.id ASC`,
      )
      .all(memberId, fromDate, toDate);
  }
}
