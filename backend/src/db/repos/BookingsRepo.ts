import type { Db } from '../client.js';
import type { BookingRow } from '../types.js';

export interface CreateBookingInput {
  member_id: number;
  drink_id: number;
  price_cents_snapshot: number;
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
   * Paginierte Liste von Buchungen eines Mitglieds (Cursor-basiert über `beforeId`).
   * Reihenfolge: neueste zuerst.
   */
  findByMember(memberId: number, limit = 50, beforeId?: number): PaginatedBookings {
    const params: unknown[] = [memberId];
    let sql = `
      SELECT * FROM bookings
      WHERE member_id = ?
        AND voided_at IS NULL
    `;

    if (beforeId !== undefined) {
      sql += ' AND id < ?';
      params.push(beforeId);
    }

    sql += ' ORDER BY booked_at DESC LIMIT ?';
    params.push(limit + 1); // +1 um hasMore zu erkennen

    const rows = this.db.prepare<unknown[], BookingRow>(sql).all(...params);
    const hasMore = rows.length > limit;

    return { items: rows.slice(0, limit), hasMore };
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
      >(`SELECT * FROM bookings ${where} ORDER BY booked_at DESC LIMIT ?`)
      .all(...params);
  }

  create(input: CreateBookingInput): BookingRow {
    const result = this.db
      .prepare(
        `INSERT INTO bookings (member_id, drink_id, price_cents_snapshot)
         VALUES (@member_id, @drink_id, @price_cents_snapshot)`,
      )
      .run(input);

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

  /** Aggregation für Reporting: Summe pro Getränk in einem Zeitraum. */
  sumByDrink(
    memberId: number,
    fromDate: string,
    toDate: string,
  ): Array<{ drink_id: number; count: number; total_cents: number }> {
    return this.db
      .prepare<[number, string, string], { drink_id: number; count: number; total_cents: number }>(
        `SELECT drink_id,
                COUNT(*)                     AS count,
                SUM(price_cents_snapshot)    AS total_cents
         FROM bookings
         WHERE member_id = ?
           AND booked_at BETWEEN ? AND ?
           AND voided_at IS NULL
         GROUP BY drink_id`,
      )
      .all(memberId, fromDate, toDate);
  }
}
