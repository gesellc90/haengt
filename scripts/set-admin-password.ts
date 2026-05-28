#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Setzt das Passwort eines Mitglieds direkt in der Datenbank.
 *
 * Verwendung:
 *   npx tsx scripts/set-admin-password.ts --username admin --password geheimesPasswort
 *
 * Optionen:
 *   --username  Benutzername des Mitglieds (Standard: admin)
 *   --password  Neues Klartext-Passwort (wird mit bcrypt gehasht)
 *
 * Voraussetzungen auf dem Pi:
 *   - /etc/getraenke/env muss lesbar sein (oder ENV-Variablen sind gesetzt)
 *   - DB_PATH muss auf die SQLite-Datei zeigen
 *
 * Beispiel auf dem Pi:
 *   cd /opt/getraenke/current
 *   sudo -u getraenke env $(cat /etc/getraenke/env | xargs) \
 *     npx tsx scripts/set-admin-password.ts --password meinSicheresPasswort
 */

import bcrypt from 'bcryptjs';
import { loadEnv } from '../backend/src/utils/env.js';
import { openDatabase } from '../backend/src/db/client.js';

// ---------------------------------------------------------------------------
// CLI-Argumente parsen
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const username = getArg('username') ?? 'admin';
const password = getArg('password');

if (!password) {
  console.error('Fehler: --password ist erforderlich.');
  console.error(
    'Verwendung: npx tsx scripts/set-admin-password.ts --username admin --password <passwort>',
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error('Fehler: Passwort muss mindestens 8 Zeichen lang sein.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// DB öffnen und Passwort setzen
// ---------------------------------------------------------------------------

const env = loadEnv();
const db = openDatabase(env.DB_PATH);

const member = db
  .prepare<[string], { id: number; display_name: string }>(`
    SELECT id, display_name FROM members WHERE username = ?
  `)
  .get(username);

if (!member) {
  console.error(`Fehler: Kein Mitglied mit username="${username}" gefunden.`);
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);

db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(hash, member.id);

console.log(
  `✓ Passwort für "${username}" (${member.display_name}) erfolgreich gesetzt.`,
);
console.log(`  DB: ${env.DB_PATH}`);
