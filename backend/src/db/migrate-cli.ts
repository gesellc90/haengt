/* eslint-disable no-console */
/**
 * CLI-Einstiegspunkt für `npm run db:migrate`.
 * Lädt die ENV, öffnet die DB und führt alle ausstehenden Migrationen aus.
 */
import { loadEnv } from '../utils/env.js';
import { openDatabase } from './client.js';
import { runMigrations } from './migrate.js';

const env = loadEnv();
const db = openDatabase(env.DB_PATH);

const applied = runMigrations(db);

if (applied === 0) {
  console.log('[migrate] Bereits aktuell – keine neuen Migrationen.');
} else {
  console.log(`[migrate] ✓ ${applied} Migration(en) erfolgreich angewendet.`);
}

db.close();
