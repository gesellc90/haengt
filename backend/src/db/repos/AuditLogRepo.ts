import type { Db } from '../client.js';
import type { AuditLogRow } from '../types.js';

export interface CreateAuditLogInput {
  event_type: string;
  actor_id?: number | null;
  target_type?: string | null;
  target_id?: number | null;
  meta?: Record<string, unknown> | null;
}

export class AuditLogRepo {
  constructor(private readonly db: Db) {}

  create(input: CreateAuditLogInput): AuditLogRow {
    const result = this.db
      .prepare(
        `INSERT INTO audit_log (event_type, actor_id, target_type, target_id, meta)
         VALUES (@event_type, @actor_id, @target_type, @target_id, @meta)`,
      )
      .run({
        event_type: input.event_type,
        actor_id: input.actor_id ?? null,
        target_type: input.target_type ?? null,
        target_id: input.target_id ?? null,
        meta: input.meta !== null && input.meta !== undefined ? JSON.stringify(input.meta) : null,
      });

    return this.db
      .prepare<[number | bigint], AuditLogRow>('SELECT * FROM audit_log WHERE id = ?')
      .get(result.lastInsertRowid)!;
  }

  findByEventType(eventType: string, limit = 100): AuditLogRow[] {
    return this.db
      .prepare<
        [string, number],
        AuditLogRow
      >('SELECT * FROM audit_log WHERE event_type = ? ORDER BY created_at DESC LIMIT ?')
      .all(eventType, limit);
  }
}
