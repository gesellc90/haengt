/**
 * Test-Hilfsfunktionen für die DB-Schicht.
 *
 * `createTestDb()` öffnet eine In-Memory-SQLite-Datenbank und führt
 * alle Migrationen aus. So testen wir gegen das echte Schema – keine Mocks.
 */
import { openDatabase, type Db } from '../../../src/db/client.js';
import { runMigrations } from '../../../src/db/migrate.js';

export function createTestDb(): Db {
  const db = openDatabase(':memory:');
  runMigrations(db);
  return db;
}
