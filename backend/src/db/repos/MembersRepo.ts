import type { Db } from '../client.js';
import type { MemberRow } from '../types.js';

export interface CreateMemberInput {
  username: string;
  display_name: string;
  password_hash?: string | null;
  role?: 'admin' | 'member';
}

export interface UpdateMemberInput {
  display_name?: string;
  password_hash?: string | null;
  role?: 'admin' | 'member';
  is_active?: 0 | 1;
}

export class MembersRepo {
  constructor(private readonly db: Db) {}

  findById(id: number): MemberRow | undefined {
    return this.db.prepare<[number], MemberRow>('SELECT * FROM members WHERE id = ?').get(id);
  }

  findByUsername(username: string): MemberRow | undefined {
    return this.db
      .prepare<[string], MemberRow>('SELECT * FROM members WHERE username = ? COLLATE NOCASE')
      .get(username);
  }

  findAll(includeInactive = false): MemberRow[] {
    const sql = includeInactive
      ? 'SELECT * FROM members ORDER BY display_name'
      : 'SELECT * FROM members WHERE is_active = 1 ORDER BY display_name';
    return this.db.prepare<[], MemberRow>(sql).all();
  }

  create(input: CreateMemberInput): MemberRow {
    const result = this.db
      .prepare(
        `INSERT INTO members (username, display_name, password_hash, role)
         VALUES (@username, @display_name, @password_hash, @role)`,
      )
      .run({
        username: input.username,
        display_name: input.display_name,
        password_hash: input.password_hash ?? null,
        role: input.role ?? 'member',
      });

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: UpdateMemberInput): MemberRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    this.db
      .prepare(
        `UPDATE members
         SET display_name  = @display_name,
             password_hash = @password_hash,
             role          = @role,
             is_active     = @is_active
         WHERE id = @id`,
      )
      .run({
        id,
        display_name: input.display_name ?? existing.display_name,
        password_hash:
          input.password_hash !== undefined ? input.password_hash : existing.password_hash,
        role: input.role ?? existing.role,
        is_active: input.is_active ?? existing.is_active,
      });

    return this.findById(id);
  }

  /** Soft-Delete: setzt is_active = 0. */
  deactivate(id: number): boolean {
    const result = this.db.prepare('UPDATE members SET is_active = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
