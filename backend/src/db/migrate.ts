import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Führt alle noch nicht angewendeten Migrationen aus.
 *
 * Konventionen:
 *  - Migrations-Dateien: `<NNN>_<beschreibung>.sql` (z. B. `001_members.sql`)
 *  - Reihenfolge: alphabetisch/numerisch aufsteigend nach Dateiname
 *  - Jede Migration läuft in einer eigenen Transaktion
 *  - Bereits gelaufene Migrationen werden in `schema_migrations` vermerkt
 *    und nicht erneut ausgeführt (idempotent)
 *
 * @returns Anzahl der neu angewendeten Migrationen
 */
export function runMigrations(db: Db): number {
  ensureMigrationsTable(db);

  const applied = getAppliedMigrations(db);
  const files = getPendingMigrationFiles(applied);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    // Jede Migration läuft atomar – schlägt sie fehl, rollt die Transaktion zurück.
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString(),
      );
    })();
  }

  return files.length;
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function ensureMigrationsTable(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);
}

function getAppliedMigrations(db: Db): Set<string> {
  const rows = db.prepare('SELECT name FROM schema_migrations ORDER BY name').all() as {
    name: string;
  }[];
  return new Set(rows.map((r) => r.name));
}

function getPendingMigrationFiles(applied: Set<string>): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => !applied.has(f));
}
