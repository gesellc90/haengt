/**
 * Setzt deterministische Test-Daten direkt in der E2E-SQLite-DB.
 *
 * - Annahme: alle Migrationen sind bereits ausgeführt (das übernimmt der
 *   Backend-Boot via runMigrations).
 * - Annahme: backend/dist/db/seed.js wurde davor ausgeführt (anlegen
 *   von Members ohne password_hash, Drinks, Preise).
 * - Aufgabe hier: realistische bcrypt-Hashes für die seed-User setzen
 *   plus eine „alte" Buchung anlegen (Storno-Fenster bereits abgelaufen).
 *
 * Test-Credentials (NICHT in Produktion verwenden!):
 *   admin  / admin-passwort
 *   anna   / anna-passwort
 *   bernd  / bernd-passwort
 *
 * Wird als `.mjs` ohne TypeScript geschrieben, damit das globalSetup das
 * Skript direkt mit `node` aufrufen kann — kein tsx/esbuild-Schritt nötig.
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const dbPath = process.argv[2];
if (!dbPath) {
  console.error('[test-seed] Usage: node test-seed.mjs <db-path>');
  process.exit(1);
}

export const TEST_PASSWORDS = Object.freeze({
  admin: 'admin-passwort',
  anna: 'anna-passwort',
  bernd: 'bernd-passwort',
});

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// bcryptjs cost-factor 4: E2E-Setup soll < 1 s laufen.
// Produktion nutzt cost 10 (siehe AuthService).
const updatePw = db.prepare('UPDATE members SET password_hash = ? WHERE username = ?');
for (const [username, plain] of Object.entries(TEST_PASSWORDS)) {
  const hash = bcrypt.hashSync(plain, 4);
  const info = updatePw.run(hash, username);
  if (info.changes === 0) {
    console.warn(`[test-seed] Warnung: kein Member mit username='${username}' gefunden.`);
  }
}

// „Alte" Buchung für 03-void.spec.ts negativ-Pfad (außerhalb des 5-Min-Fensters).
const annaId = db.prepare('SELECT id FROM members WHERE username = ?').get('anna')?.id;
const bierId = db.prepare('SELECT id FROM drinks WHERE name = ?').get('Bier')?.id;
if (annaId !== undefined && bierId !== undefined) {
  const bierPrice =
    db.prepare(
      'SELECT price_cents FROM drink_prices WHERE drink_id = ? ORDER BY id DESC LIMIT 1',
    ).get(bierId)?.price_cents ?? 150;
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    .toISOString()
    .replace(/\.\d+Z$/, 'Z');
  db.prepare(
    'INSERT INTO bookings (member_id, drink_id, price_cents_snapshot, booked_at) VALUES (?, ?, ?, ?)',
  ).run(annaId, bierId, bierPrice, tenMinutesAgo);
  console.log(`[test-seed] Alte Buchung (anna, Bier, ${tenMinutesAgo}) angelegt.`);
}

db.close();
console.log('[test-seed] ✓ Test-Daten gesetzt.');
