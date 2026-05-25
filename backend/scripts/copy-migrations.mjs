#!/usr/bin/env node
/**
 * backend/scripts/copy-migrations.mjs
 *
 * Kopiert die .sql-Migrations-Files nach dem `tsc`-Build von
 *   src/db/migrations/  →  dist/db/migrations/
 *
 * tsc ignoriert Nicht-TS-Files; das Migrations-Runner-Modul löst seinen
 * Pfad zur Laufzeit via `import.meta.url` auf — ohne diesen Copy-Step
 * würde `node dist/db/migrate-cli.js` (Produktion + E2E + Deploy) keine
 * Migrationen finden.
 *
 * Wird automatisch von `npm run build --workspace=backend` aufgerufen.
 */

import { cpSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src/db/migrations');
const DST = resolve(__dirname, '../dist/db/migrations');

if (!existsSync(SRC)) {
  console.error(`[copy-migrations] Quellverzeichnis fehlt: ${SRC}`);
  process.exit(1);
}

cpSync(SRC, DST, { recursive: true });
console.log(`[copy-migrations] ✓ ${SRC} → ${DST}`);
