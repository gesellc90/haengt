import type { Db } from '../client.js';
import type { VerbindungRow } from '../types.js';

export interface CreateVerbindungInput {
  name: string;
  zirkel?: string | null;
  ort?: string | null;
}

export interface UpdateVerbindungInput {
  name?: string;
  zirkel?: string | null;
  ort?: string | null;
  active?: 0 | 1;
}

export class VerbindungenRepo {
  constructor(private readonly db: Db) {}

  findById(id: number): VerbindungRow | undefined {
    return this.db
      .prepare<[number], VerbindungRow>('SELECT * FROM verbindungen WHERE id = ?')
      .get(id);
  }

  findAll(includeInactive = false): VerbindungRow[] {
    const sql = includeInactive
      ? 'SELECT * FROM verbindungen ORDER BY name COLLATE NOCASE'
      : 'SELECT * FROM verbindungen WHERE active = 1 ORDER BY name COLLATE NOCASE';
    return this.db.prepare<[], VerbindungRow>(sql).all();
  }

  create(input: CreateVerbindungInput): VerbindungRow {
    const result = this.db
      .prepare(
        `INSERT INTO verbindungen (name, zirkel, ort)
         VALUES (@name, @zirkel, @ort)`,
      )
      .run({
        name: input.name,
        zirkel: input.zirkel ?? null,
        ort: input.ort ?? null,
      });

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: UpdateVerbindungInput): VerbindungRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    this.db
      .prepare(
        `UPDATE verbindungen
         SET name   = @name,
             zirkel = @zirkel,
             ort    = @ort,
             active = @active
         WHERE id = @id`,
      )
      .run({
        id,
        name: input.name ?? existing.name,
        zirkel: input.zirkel !== undefined ? input.zirkel : existing.zirkel,
        ort: input.ort !== undefined ? input.ort : existing.ort,
        active: input.active ?? existing.active,
      });

    return this.findById(id);
  }

  deactivate(id: number): boolean {
    const result = this.db.prepare('UPDATE verbindungen SET active = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
