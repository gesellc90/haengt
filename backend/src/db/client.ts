import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

export type Db = Database.Database;

/**
 * Öffnet eine better-sqlite3-Datenbankverbindung und konfiguriert sie
 * für den Produktionseinsatz:
 *
 *  - WAL-Mode  → bessere Read/Write-Parallelität ohne Lese-Locks
 *  - foreign_keys = ON  → referentielle Integrität wird auf DB-Ebene erzwungen
 *  - busy_timeout = 5000 ms  → kurze Wartezeit bei konkurrierendem Zugriff
 *    (relevant, wenn Backup-Skript und API gleichzeitig laufen)
 *
 * Der Pfad `:memory:` (für Tests) überspringt die Verzeichniserstellung.
 */
export function openDatabase(dbPath: string): Db {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(path.resolve(dbPath));
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  return db;
}

// ---------------------------------------------------------------------------
// Singleton für Produktions-/Dev-Einsatz
// ---------------------------------------------------------------------------

let _instance: Db | undefined;

/**
 * Gibt die Singleton-DB-Instanz zurück.
 * Beim ersten Aufruf wird die Verbindung geöffnet.
 *
 * @param dbPath – Überschreibt den Default-Pfad (nützlich in Tests).
 *                 Wird nur beim allerersten Aufruf ausgewertet.
 */
export function getDatabase(dbPath = './data/getraenke.db'): Db {
  if (!_instance) {
    _instance = openDatabase(dbPath);
  }
  return _instance;
}

/**
 * Schließt die Singleton-Verbindung und setzt sie zurück.
 * Sollte in Tests nach jedem Testlauf aufgerufen werden.
 */
export function closeDatabase(): void {
  _instance?.close();
  _instance = undefined;
}
