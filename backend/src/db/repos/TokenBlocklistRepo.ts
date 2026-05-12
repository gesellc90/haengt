import type { Db } from '../client.js';

export interface TokenBlocklistRow {
  jti: string;
  expires_at: string;
  created_at: string;
}

export class TokenBlocklistRepo {
  constructor(private readonly db: Db) {}

  /** Fügt eine JTI zur Blocklist hinzu. `expiresAt` ist ein ISO-8601-UTC-String. */
  add(jti: string, expiresAt: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO token_blocklist (jti, expires_at) VALUES (?, ?)')
      .run(jti, expiresAt);
  }

  /** Gibt `true` zurück, wenn die JTI auf der Blocklist steht. */
  isBlocked(jti: string): boolean {
    const row = this.db
      .prepare<[string], { jti: string }>('SELECT jti FROM token_blocklist WHERE jti = ?')
      .get(jti);
    return row !== undefined;
  }

  /**
   * Löscht alle abgelaufenen Einträge.
   * Sollte gelegentlich aufgerufen werden (z. B. beim Login), damit die Tabelle
   * nicht unbegrenzt wächst.
   */
  pruneExpired(): number {
    const result = this.db
      .prepare(
        "DELETE FROM token_blocklist WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
      )
      .run();
    return result.changes;
  }
}
