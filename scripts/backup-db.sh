#!/usr/bin/env bash
# scripts/backup-db.sh
#
# Erstellt ein konsistentes Online-Backup der SQLite-Datenbank.
# SQLite's .backup-Befehl nutzt die integrierte Hot-Backup-API, sodass
# die Datenbank während des Backups weiterhin beschreibbar bleibt (WAL-sicher).
#
# Verwendung:
#   ./scripts/backup-db.sh [DB_PATH] [BACKUP_DIR]
#
# Umgebungsvariablen (Fallback wenn keine Argumente):
#   DB_PATH     – Pfad zur SQLite-Datei (Default: ./backend/data/getraenke.db)
#   BACKUP_DIR  – Zielverzeichnis         (Default: ./backups)
#   KEEP_DAYS   – Backups älter als N Tage löschen (Default: 7)
#
# Beispiel:
#   DB_PATH=/opt/getraenke/data/getraenke.db BACKUP_DIR=/opt/backups ./scripts/backup-db.sh

set -euo pipefail

DB_PATH="${1:-${DB_PATH:-./backend/data/getraenke.db}}"
BACKUP_DIR="${2:-${BACKUP_DIR:-./backups}}"
KEEP_DAYS="${KEEP_DAYS:-7}"

# Datenbankdatei muss existieren
if [[ ! -f "$DB_PATH" ]]; then
  echo "[backup] Fehler: Datenbankdatei nicht gefunden: $DB_PATH" >&2
  exit 1
fi

# sqlite3 CLI muss vorhanden sein
if ! command -v sqlite3 &>/dev/null; then
  echo "[backup] Fehler: sqlite3 nicht gefunden. Bitte installieren (z. B. apt install sqlite3)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/getraenke_${TIMESTAMP}.db"

echo "[backup] Starte Backup: $DB_PATH → $BACKUP_FILE"
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"
echo "[backup] Backup erfolgreich: $BACKUP_FILE"

# Alte Backups rotieren
DELETED=$(find "$BACKUP_DIR" -name 'getraenke_*.db' -mtime +"$KEEP_DAYS" -print -delete | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
  echo "[backup] $DELETED altes Backup/Backups gelöscht (älter als $KEEP_DAYS Tage)."
fi

echo "[backup] ✓ Fertig."
