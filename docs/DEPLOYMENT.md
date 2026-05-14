# Deployment

Dieses Dokument beschreibt, wie die App auf den Vereins-Raspberry-Pi
deployed wird. Es deckt aktuell die **systemd-Service-Unit** (PR 1) ab.
Der automatisierte Deploy-Workflow (PR 2) und die Pi-Grundeinrichtung
(PR 4) folgen in separaten Patches und werden hier hinzugefügt.

## Verzeichnis-Layout auf dem Pi

```
/opt/getraenke/
├── current                  → Symlink auf das aktive Release
└── releases/
    ├── v0.1.0/              # Erstes Release
    │   ├── backend/dist/    # tsc-Output (Backend)
    │   ├── backend/node_modules/   # production-only (npm ci --omit=dev)
    │   ├── backend/package.json
    │   ├── frontend/dist/   # vite-Build (Frontend)
    │   └── …
    └── v0.1.1/              # Nächstes Release (atomarer Symlink-Swap)

/etc/getraenke/
└── env                      # EnvironmentFile (Mode 0640, root:getraenke)

/var/lib/getraenke/          # SQLite-DB (vom Service-User beschreibbar)
└── getraenke.db

/var/backups/getraenke/      # Backups (vom Deploy-Skript beschrieben)
└── v0.1.0-20260514T080000Z.sqlite
```

**Warum dieses Layout?** `/opt` für Drittsoftware, `/var/lib` für
veränderliche Daten, `/etc` für Konfiguration — FHS-konform. systemd legt
`/var/lib/getraenke` automatisch via `StateDirectory=getraenke` an, sodass
die Pi-Grundeinrichtung nur die anderen Verzeichnisse erstellen muss.

## Service-Account

Die App läuft als unprivilegierter Systembenutzer `getraenke`:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin getraenke
```

Dieser User hat **keinen Login-Shell** und **kein Home-Verzeichnis** —
das passt zur `ProtectHome=true`-Direktive in der Unit.

## EnvironmentFile

Datei `/etc/getraenke/env` mit folgendem Inhalt (Beispiel):

```bash
# /etc/getraenke/env – wird von systemd in den Prozess injiziert.
# Mode 0640, owner root:getraenke.
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Pfad zur SQLite-Datei. Muss innerhalb des StateDirectory liegen,
# da systemd alles andere read-only macht (ProtectSystem=strict).
DB_PATH=/var/lib/getraenke/getraenke.db

# JWT-Secret: mindestens 32 Zeichen, kryptografisch zufällig.
# Erzeugen z. B. mit:  openssl rand -hex 48
JWT_SECRET=<HIER 32+ zufällige Zeichen einsetzen, NIE committen!>
JWT_EXPIRES_IN=8h
```

Berechtigungen setzen:

```bash
sudo install -d -m 0750 -o root -g getraenke /etc/getraenke
sudo install -m 0640 -o root -g getraenke /dev/stdin /etc/getraenke/env <<'EOF'
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
DB_PATH=/var/lib/getraenke/getraenke.db
JWT_SECRET=<bitte ersetzen>
JWT_EXPIRES_IN=8h
EOF
```

> **Hinweis zur Bind-Adresse:** Express bindet aktuell ohne `host`-Parameter,
> d. h. auf `0.0.0.0` — die App ist im Vereins-WLAN über
> `http://<pi-ip>:3001` erreichbar. Falls später ein Reverse-Proxy
> (Caddy/nginx) davor kommt, kann die App auf `127.0.0.1` umgestellt werden
> (erfordert kleine Anpassung in `backend/src/server.ts`).

## Service installieren

```bash
# Aus dem Repo-Checkout heraus:
sudo cp scripts/getraenke.service /etc/systemd/system/getraenke.service
sudo systemctl daemon-reload
sudo systemctl enable --now getraenke.service
```

## Service verifizieren

### Syntax und Härtung prüfen

```bash
# Syntax + Pfad-Auflösung (warnt bei ExecStart-Datei, die nicht existiert –
# das ist auf dem Build-Host normal, solange noch kein Release deployed ist).
sudo systemd-analyze verify scripts/getraenke.service

# Härtungs-Score – Ziel: < 3.0 („OK") oder besser.
sudo systemd-analyze security getraenke.service
```

`systemd-analyze security` zeigt detailliert, welche Sandbox-Direktiven gesetzt
sind und wo noch Lücken bestehen. Aktuelle Annahme: Wert liegt im
„OK"-Bereich (1.5–3.0), weil wir Capabilities, Namespaces und Syscalls
strikt einschränken.

### Liveness-Check

Der Backend-Smoke-Test läuft gegen `/api/v1/health`:

```bash
curl -fsS http://localhost:3001/api/v1/health
# {"status":"ok","uptime":12.34,"timestamp":"2026-05-14T08:00:00.000Z"}
```

Dieser Endpunkt wird im Deploy-Workflow (PR 2) für den Post-Deploy-Smoke-Test
verwendet.

### Logs lesen

```bash
# Live-Stream (pino-JSON):
sudo journalctl -u getraenke.service -f

# Hübsch formatieren (falls pino-pretty global installiert ist):
sudo journalctl -u getraenke.service -f -o cat | npx pino-pretty
```

## Häufige Probleme

| Symptom                                                   | Wahrscheinliche Ursache                  | Fix                                                          |
| --------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `status=203/EXEC` beim Start                              | `/usr/bin/node` existiert nicht          | Node via NodeSource installieren (siehe Pi-Setup, PR 4)      |
| `Permission denied` auf DB                                | `DB_PATH` außerhalb von `StateDirectory` | Pfad muss unter `/var/lib/getraenke/` liegen                 |
| `JWT_SECRET muss mindestens 32 Zeichen`                   | EnvironmentFile zu kurz/leer             | `openssl rand -hex 48` und in `/etc/getraenke/env` eintragen |
| Service startet, aber `curl /health` → connection refused | `PORT` weicht von `3001` ab              | EnvironmentFile prüfen, Firewall (`ufw`) prüfen              |
| `Failed to set up StateDirectory`                         | systemd zu alt (< 235)                   | Pi OS Bookworm bringt systemd 252 — OK                       |

## Folge-PRs

- **PR 2 (Deploy-Workflow):** `.github/workflows/deploy.yml`, `scripts/getraenke-deploy.sudoers`, Rollback-Prozedur.
- **PR 3 (E2E-Suite):** Playwright-Tests gegen einen lokalen Backend-Build, `docs/TESTING.md`.
- **PR 4 (Pi-Setup):** `docs/RASPBERRY-PI-SETUP.md` (OS-Hardening, Node 20, sqlite3), `docs/RUNNER-SETUP.md` (GitHub Actions Self-Hosted Runner).
