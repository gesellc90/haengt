import type { Db } from '../client.js';
import type { ZeigerRow, ZeigerArt, ZeigerStatus } from '../types.js';

export interface CreateZeigerInput {
  titel: string;
  art: ZeigerArt;
  verbindung_id?: number | null;
  created_by: number;
  anzahl_bundesbrueder?: number;
  anzahl_gaeste?: number;
}

export interface UpdateZeigerInput {
  anzahl_bundesbrueder?: number;
  anzahl_gaeste?: number;
  status?: ZeigerStatus;
  closed_at?: string | null;
  closed_by?: number | null;
}

export class ZeigerRepo {
  constructor(private readonly db: Db) {}

  findById(id: number): ZeigerRow | undefined {
    return this.db.prepare<[number], ZeigerRow>('SELECT * FROM zeiger WHERE id = ?').get(id);
  }

  findAll(status?: ZeigerStatus): ZeigerRow[] {
    if (status !== undefined) {
      return this.db
        .prepare<
          [string],
          ZeigerRow
        >('SELECT * FROM zeiger WHERE status = ? ORDER BY opened_at DESC')
        .all(status);
    }
    return this.db.prepare<[], ZeigerRow>('SELECT * FROM zeiger ORDER BY opened_at DESC').all();
  }

  create(input: CreateZeigerInput): ZeigerRow {
    const result = this.db
      .prepare(
        `INSERT INTO zeiger
           (titel, art, verbindung_id, created_by, anzahl_bundesbrueder, anzahl_gaeste)
         VALUES
           (@titel, @art, @verbindung_id, @created_by, @anzahl_bundesbrueder, @anzahl_gaeste)`,
      )
      .run({
        titel: input.titel,
        art: input.art,
        verbindung_id: input.verbindung_id ?? null,
        created_by: input.created_by,
        anzahl_bundesbrueder: input.anzahl_bundesbrueder ?? 0,
        anzahl_gaeste: input.anzahl_gaeste ?? 0,
      });

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: UpdateZeigerInput): ZeigerRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    this.db
      .prepare(
        `UPDATE zeiger
         SET anzahl_bundesbrueder = @anzahl_bundesbrueder,
             anzahl_gaeste        = @anzahl_gaeste,
             status               = @status,
             closed_at            = @closed_at,
             closed_by            = @closed_by
         WHERE id = @id`,
      )
      .run({
        id,
        anzahl_bundesbrueder: input.anzahl_bundesbrueder ?? existing.anzahl_bundesbrueder,
        anzahl_gaeste: input.anzahl_gaeste ?? existing.anzahl_gaeste,
        status: input.status ?? existing.status,
        closed_at: input.closed_at !== undefined ? input.closed_at : existing.closed_at,
        closed_by: input.closed_by !== undefined ? input.closed_by : existing.closed_by,
      });

    return this.findById(id);
  }
}
