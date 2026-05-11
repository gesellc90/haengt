# Getränkeabrechnung

Lokale Web-App zur Getränkeabrechnung eines Vereins. Mitglieder buchen ihre Getränke per Self-Service, Admins verwalten Stammdaten und exportieren Monatsabrechnungen als PDF oder CSV. Die Anwendung läuft auf einem Raspberry Pi im Vereins-WLAN — keine Cloud, keine externen Abhängigkeiten zur Laufzeit.

## Features

- 🔐 Login für Mitglieder (PIN oder Passwort)
- 🍺 Schnelle Getränkebuchung mit Tap-Bedienung (mobilfreundlich)
- 👤 Admin-Bereich für Mitglieder-, Getränke- und Preisverwaltung
- 📊 Monatsabrechnung pro Mitglied als PDF und CSV
- 📜 Buchungshistorie & Stornierung innerhalb eines Zeitfensters
- 📱 Responsive UI (Tablet, Smartphone, Desktop)

## Tech-Stack

| Bereich     | Technologie                          |
|-------------|--------------------------------------|
| Backend     | Node.js 20 LTS, Express              |
| Datenbank   | SQLite (better-sqlite3)              |
| Frontend    | React 18, Vite, TailwindCSS          |
| Auth        | JWT + bcrypt                         |
| Tests       | Vitest, Supertest, Playwright        |
| Linting     | ESLint, Prettier                     |
| CI/CD       | GitHub Actions (Self-Hosted Runner)  |
| Hosting     | Raspberry Pi 4/5, systemd            |

## Projektstruktur

```
getraenkeabrechnung/
├── backend/        # Express API + SQLite
├── frontend/       # React App (Vite)
├── docs/           # Architektur- und Meilenstein-Doku
├── scripts/        # Deploy- und Wartungsskripte
└── .github/        # CI/CD-Workflows
```

## Voraussetzungen

- Node.js ≥ 20.x
- npm ≥ 10.x
- Git
- (Für Deployment) Raspberry Pi 4/5 mit Raspberry Pi OS 64-bit

## Lokales Setup

```bash
# 1. Repository klonen
git clone https://github.com/gesellc90/h-ngt.git
cd h-ngt

# 2. Dependencies installieren (Backend & Frontend)
npm run install:all

# 3. Environment-Datei anlegen
cp backend/.env.example backend/.env
# JWT_SECRET, PORT etc. anpassen

# 4. Datenbank initialisieren & Seed-Daten laden
npm run db:migrate --workspace=backend
npm run db:seed --workspace=backend

# 5. Entwicklungsserver starten (Backend + Frontend parallel)
npm run dev
```

Backend läuft anschließend unter `http://localhost:3001`, Frontend unter `http://localhost:5173`.

### Standard-Logindaten (Seed)

| Rolle    | Benutzer | Passwort   |
|----------|----------|------------|
| Admin    | `admin`  | `admin123` |
| Mitglied | `demo`   | `demo123`  |

> ⚠️ Vor dem Produktiv-Deployment **unbedingt** ändern.

## Häufige Skripte

| Befehl                        | Beschreibung                               |
|-------------------------------|--------------------------------------------|
| `npm run dev`                 | Backend + Frontend im Watch-Mode           |
| `npm run lint`                | ESLint über das gesamte Projekt            |
| `npm test`                    | Unit- und Integrationstests                |
| `npm run test:e2e`            | Playwright E2E-Tests                       |
| `npm run build`               | Production-Build des Frontends             |
| `npm run db:migrate`          | Datenbankmigrationen ausführen             |
| `npm run deploy:pi`           | Deployment auf den Raspberry Pi            |

## Deployment

Siehe [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Kurzfassung: GitHub Actions baut auf dem Self-Hosted Runner (Raspberry Pi), legt das Build-Artefakt nach `/opt/getraenke/` ab und startet den `getraenke.service` (systemd) neu.

## Mitarbeit

Beiträge sind willkommen — siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

MIT
