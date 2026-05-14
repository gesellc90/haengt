#!/usr/bin/env bash
# scripts/deploy-migrate.sh
#
# Führt Datenbank-Migrationen für ein bereits ausgepacktes Release aus.
# Wird vom Deploy-Workflow (.github/workflows/deploy.yml) auf dem Pi
# aufgerufen, ZWISCHEN „Backup" und „Symlink-Swap".
#
# Aufruf:
#   ./scripts/deploy-migrate.sh /opt/getraenke/releases/v0.1.0
#
# Voraussetzungen:
#   - /etc/getraenke/env existiert und ist für den aufrufenden User lesbar
#     (Mode 0640, root:getraenke — Runner-User muss in Gruppe getraenke sein).
#   - sudo erlaubt dem Runner: `sudo -u getraenke /usr/bin/node <RELEASE>/backend/dist/db/migrate-cli.js`
#     (siehe scripts/getraenke-deploy.sudoers).
#
# Schlägt das Skript fehl, bricht der Deploy ab — der Symlink wird NICHT
# umgehängt, der Service läuft auf dem alten Release weiter.

set -euo pipefail

RELEASE_DIR="${1:?Pfad zum Release-Verzeichnis fehlt (z. B. /opt/getraenke/releases/v0.1.0)}"
ENV_FILE="${ENV_FILE:-/etc/getraenke/env}"
MIGRATE_JS="$RELEASE_DIR/backend/dist/db/migrate-cli.js"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "[migrate] Fehler: $ENV_FILE nicht lesbar (Gruppe getraenke fehlt?)." >&2
  exit 1
fi

if [[ ! -f "$MIGRATE_JS" ]]; then
  echo "[migrate] Fehler: $MIGRATE_JS nicht gefunden. Build unvollständig?" >&2
  exit 1
fi

# ENV-Datei laden (KEY=VALUE-Format; systemd-kompatibel, kein `export` nötig).
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "[migrate] Starte Migration für Release: $RELEASE_DIR"
echo "[migrate] DB_PATH=$DB_PATH"

# Als App-User getraenke ausführen, damit der Owner der DB-Datei stimmt.
# Wir reichen genau die für loadEnv() benötigten Variablen weiter — sudo
# strippt sonst ENV-Variablen aus Sicherheitsgründen.
sudo -u getraenke \
  env \
    "NODE_ENV=${NODE_ENV:-production}" \
    "DB_PATH=$DB_PATH" \
    "JWT_SECRET=$JWT_SECRET" \
    "JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-8h}" \
    "LOG_LEVEL=${LOG_LEVEL:-info}" \
    "PORT=${PORT:-3001}" \
  /usr/bin/node "$MIGRATE_JS"

echo "[migrate] ✓ Migration abgeschlossen."
