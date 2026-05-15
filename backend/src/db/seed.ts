/* eslint-disable no-console */
/**
 * Seed-Skript – befüllt die Datenbank mit Demo-Daten.
 *
 * Verwendung:
 *   npm run db:seed                   # Standard-DB-Pfad aus DB_PATH/.env
 *   DB_PATH=:memory: tsx src/db/seed  # Nur für Smoke-Tests
 *
 * Das Skript ist idempotent: Läuft es ein zweites Mal, werden keine
 * Duplikate angelegt (INSERT OR IGNORE auf username/name).
 *
 * HINWEIS zu Passwörtern: Dieser Seed legt Members OHNE `password_hash` an —
 * das Schema (Migration 001) erlaubt NULL für Bestands-Daten und initiale
 * Setups. Vor dem ersten Login muss ein Admin manuell ein Passwort setzen,
 * entweder direkt per SQL oder über `PATCH /api/v1/members/:id` mit
 * `password` im Body.
 *
 * Für die E2E-Suite werden die bcrypt-Hashes anschließend von
 * `e2e/seed/test-seed.mjs` gesetzt — dort liegen auch die Test-Passwörter.
 */

import { loadEnv } from '../utils/env.js';
import { openDatabase } from './client.js';
import { runMigrations } from './migrate.js';

const env = loadEnv();
const db = openDatabase(env.DB_PATH);

// Sicherstellen, dass alle Migrationen angewendet sind
const applied = runMigrations(db);
if (applied > 0) {
  console.log(`[seed] ${applied} Migration(en) angewendet.`);
}

// ---------------------------------------------------------------------------
// Mitglieder
// ---------------------------------------------------------------------------

const insertMember = db.prepare(`
  INSERT OR IGNORE INTO members (username, display_name, role)
  VALUES (@username, @display_name, @role)
`);

db.transaction(() => {
  insertMember.run({ username: 'admin', display_name: 'Administrator', role: 'admin' });
  insertMember.run({ username: 'anna', display_name: 'Anna Muster', role: 'member' });
  insertMember.run({ username: 'bernd', display_name: 'Bernd Beispiel', role: 'member' });
})();

console.log('[seed] Mitglieder angelegt.');

// ---------------------------------------------------------------------------
// Getränke
// ---------------------------------------------------------------------------

const insertDrink = db.prepare(`
  INSERT OR IGNORE INTO drinks (name)
  VALUES (@name)
`);

db.transaction(() => {
  insertDrink.run({ name: 'Wasser' });
  insertDrink.run({ name: 'Cola' });
  insertDrink.run({ name: 'Bier' });
  insertDrink.run({ name: 'Spezi' });
})();

console.log('[seed] Getränke angelegt.');

// ---------------------------------------------------------------------------
// Preise (nur anlegen wenn noch kein Preis für das Getränk existiert)
// ---------------------------------------------------------------------------

const getDrinkId = db.prepare<[string], { id: number }>('SELECT id FROM drinks WHERE name = ?');
const hasPrices = db.prepare<[number], { cnt: number }>(
  'SELECT COUNT(*) AS cnt FROM drink_prices WHERE drink_id = ?',
);
const insertPrice = db.prepare(`
  INSERT INTO drink_prices (drink_id, price_cents)
  VALUES (@drink_id, @price_cents)
`);

const seedPrices: Array<{ name: string; price_cents: number }> = [
  { name: 'Wasser', price_cents: 50 },
  { name: 'Cola', price_cents: 100 },
  { name: 'Bier', price_cents: 150 },
  { name: 'Spezi', price_cents: 120 },
];

db.transaction(() => {
  for (const { name, price_cents } of seedPrices) {
    const drink = getDrinkId.get(name);
    if (!drink) continue;
    const { cnt } = hasPrices.get(drink.id)!;
    if (cnt === 0) {
      insertPrice.run({ drink_id: drink.id, price_cents });
    }
  }
})();

console.log('[seed] Preise angelegt.');
console.log('[seed] ✓ Seed abgeschlossen.');
