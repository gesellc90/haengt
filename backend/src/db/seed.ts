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
 * dieses Skript automatisch ein Standard-Passwort für den Admin- und das
 * Wirtschaftskommissions-Konto, sofern noch keines gesetzt ist:
 *
 *   Benutzername: admin   Passwort: admin123
 *   Benutzername: wiko    Passwort: wiko123
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
  INSERT OR IGNORE INTO members
    (username, display_name, role, member_status, can_book_for_others, is_wirtschaftskommission)
  VALUES
    (@username, @display_name, @role, @member_status, @can_book_for_others, @is_wirtschaftskommission)
`);

db.transaction(() => {
  insertMember.run({
    username: 'admin',
    display_name: 'Administrator',
    role: 'admin',
    member_status: 'aktiv',
    can_book_for_others: 0,
    is_wirtschaftskommission: 0,
  });
  insertMember.run({
    username: 'anna',
    display_name: 'Anna Muster',
    role: 'member',
    member_status: 'aktiv',
    can_book_for_others: 0,
    is_wirtschaftskommission: 0,
  });
  insertMember.run({
    username: 'bernd',
    display_name: 'Bernd Beispiel',
    role: 'member',
    member_status: 'alter_herr',
    can_book_for_others: 0,
    is_wirtschaftskommission: 0,
  });
  // Allgemein-Konto: darf für beliebige Mitglieder buchen (Theken-Modus).
  // Passwort wird – wie beim Admin – von einem Admin gesetzt (bleibt zunächst NULL).
  insertMember.run({
    username: 'allgemein',
    display_name: 'Allgemein',
    role: 'member',
    member_status: 'aktiv',
    can_book_for_others: 1,
    is_wirtschaftskommission: 0,
  });
  // Wirtschaftskommission: darf Konten streichen/entstreichen. Ansonsten ein
  // normales (bebuchbares) Mitglied. Passwort wird in Dev unten gesetzt.
  insertMember.run({
    username: 'wiko',
    display_name: 'Wirtschaftskommission',
    role: 'member',
    member_status: 'aktiv',
    can_book_for_others: 0,
    is_wirtschaftskommission: 1,
  });
})();

console.log('[seed] Mitglieder angelegt.');

// ---------------------------------------------------------------------------
// Dev-Passwort für Admin setzen (nur in development, nur wenn noch keines gesetzt)
// ---------------------------------------------------------------------------

if (env.NODE_ENV === 'development') {
  // Setzt ein Dev-Passwort NUR, wenn noch keines gesetzt ist (überschreibt nichts).
  const setDevPassword = async (username: string, password: string): Promise<void> => {
    const row = db
      .prepare<
        [string],
        { id: number; password_hash: string | null }
      >('SELECT id, password_hash FROM members WHERE username = ?')
      .get(username);

    if (row && row.password_hash === null) {
      const hash = await bcrypt.hash(password, 10);
      db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(hash, row.id);
      console.log(`[seed] Dev-Passwort gesetzt (Benutzername: ${username}, Passwort: ${password})`);
    } else if (row) {
      console.log(`[seed] ${username} hat bereits ein Passwort – wird nicht überschrieben.`);
    }
  };

  await setDevPassword('admin', 'admin123');
  await setDevPassword('wiko', 'wiko123');
}

// ---------------------------------------------------------------------------
// Getränke-Kategorien
//
// Die Standardkategorie „Sonstige" legt bereits Migration 011 an. Hier kommen
// nur die Demo-Kategorien hinzu (idempotent über den eindeutigen Namen).
// ---------------------------------------------------------------------------

const insertCategory = db.prepare(`
  INSERT OR IGNORE INTO drink_categories (name, sort_order)
  VALUES (@name, @sort_order)
`);

db.transaction(() => {
  insertCategory.run({ name: 'Alkoholfrei', sort_order: 1 });
  insertCategory.run({ name: 'Bier', sort_order: 2 });
})();

const getCategoryId = db.prepare<[string], { id: number }>(
  'SELECT id FROM drink_categories WHERE name = ? COLLATE NOCASE',
);

console.log('[seed] Getränke-Kategorien angelegt.');

// ---------------------------------------------------------------------------
// Getränke (jeweils einer Kategorie zugeordnet – Pflichtfeld)
// ---------------------------------------------------------------------------

const insertDrink = db.prepare(`
  INSERT OR IGNORE INTO drinks (name, category_id)
  VALUES (@name, @category_id)
`);

const seedDrinks: Array<{ name: string; category: string }> = [
  { name: 'Wasser', category: 'Alkoholfrei' },
  { name: 'Cola', category: 'Alkoholfrei' },
  { name: 'Spezi', category: 'Alkoholfrei' },
  { name: 'Bier', category: 'Bier' },
];

db.transaction(() => {
  for (const { name, category } of seedDrinks) {
    const cat = getCategoryId.get(category);
    if (!cat) continue;
    insertDrink.run({ name, category_id: cat.id });
  }
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
