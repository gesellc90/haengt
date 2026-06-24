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
 * DEV-Passwörter: In der Entwicklungsumgebung (NODE_ENV=development) setzt
 * dieses Skript automatisch ein Standard-Passwort für den Admin-Account,
 * sofern noch keines gesetzt ist:
 *
 *   Benutzername: admin
 *   Passwort:     admin123
 *
 * Das Passwort wird NUR gesetzt wenn password_hash noch NULL ist –
 * manuell gesetzte Passwörter werden nicht überschrieben.
 *
 * Für die E2E-Suite werden die bcrypt-Hashes anschließend von
 * `e2e/seed/test-seed.mjs` gesetzt — dort liegen auch die Test-Passwörter.
 */

import bcrypt from 'bcryptjs';
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
  INSERT OR IGNORE INTO members (username, display_name, role, member_status, can_book_for_others)
  VALUES (@username, @display_name, @role, @member_status, @can_book_for_others)
`);

db.transaction(() => {
  insertMember.run({
    username: 'admin',
    display_name: 'Administrator',
    role: 'admin',
    member_status: 'aktiv',
    can_book_for_others: 0,
  });
  insertMember.run({
    username: 'anna',
    display_name: 'Anna Muster',
    role: 'member',
    member_status: 'aktiv',
    can_book_for_others: 0,
  });
  insertMember.run({
    username: 'bernd',
    display_name: 'Bernd Beispiel',
    role: 'member',
    member_status: 'alter_herr',
    can_book_for_others: 0,
  });
  // Allgemein-Konto: darf für beliebige Mitglieder buchen (Theken-Modus).
  // Passwort wird – wie beim Admin – von einem Admin gesetzt (bleibt zunächst NULL).
  insertMember.run({
    username: 'allgemein',
    display_name: 'Allgemein',
    role: 'member',
    member_status: 'aktiv',
    can_book_for_others: 1,
  });
})();

console.log('[seed] Mitglieder angelegt.');

// ---------------------------------------------------------------------------
// Dev-Passwort für Admin setzen (nur in development, nur wenn noch keines gesetzt)
// ---------------------------------------------------------------------------

if (env.NODE_ENV === 'development') {
  const DEV_ADMIN_PASSWORD = 'admin123';

  const adminRow = db
    .prepare<
      [],
      { id: number; password_hash: string | null }
    >(`SELECT id, password_hash FROM members WHERE username = 'admin'`)
    .get();

  if (adminRow && adminRow.password_hash === null) {
    const hash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 10);
    db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(hash, adminRow.id);
    console.log('[seed] Dev-Passwort für Admin gesetzt (Benutzername: admin, Passwort: admin123)');
  } else if (adminRow) {
    console.log('[seed] Admin hat bereits ein Passwort – wird nicht überschrieben.');
  }
}

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

// ---------------------------------------------------------------------------
// Verbindungen (Schnellauswahl für Couleurbesuche)
// ---------------------------------------------------------------------------

const insertVerbindung = db.prepare(`
  INSERT OR IGNORE INTO verbindungen (name, zirkel, ort)
  VALUES (@name, @zirkel, @ort)
`);

db.transaction(() => {
  insertVerbindung.run({ name: 'Saxonia', zirkel: 'Sax.', ort: 'Musterstadt' });
  insertVerbindung.run({ name: 'Germania', zirkel: 'Germ.', ort: 'Beispielburg' });
  insertVerbindung.run({ name: 'Franconia', zirkel: 'Fran.', ort: 'Testingen' });
})();

console.log('[seed] Verbindungen angelegt.');
console.log('[seed] ✓ Seed abgeschlossen.');
