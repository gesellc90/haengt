# Milestones

Dieser Plan unterteilt das Projekt in 7 aufeinander aufbauende Meilensteine. Jeder Meilenstein liefert einen demonstrierbaren Mehrwert und kann in 3–7 Tagen abgeschlossen werden.

| #  | Titel                              | Dauer (geschätzt) | Abhängigkeiten |
|----|------------------------------------|-------------------|----------------|
| M1 | Projekt-Setup & Tooling            | 2–3 Tage          | —              |
| M2 | Datenbankschicht & Migrationen     | 2–3 Tage          | M1             |
| M3 | Authentifizierung & Sicherheit     | 3–4 Tage          | M2             |
| M4 | API / Backend-Logik                | 5–7 Tage          | M3             |
| M5 | Frontend (React)                   | 5–7 Tage          | M4 (parallel ab M3 möglich) |
| M6 | Reporting & Export (PDF/CSV)       | 3–4 Tage          | M4             |
| M7 | CI/CD, Deployment & E2E-Tests      | 3–4 Tage          | M5, M6         |

---

## M1 — Projekt-Setup & Tooling

**Ziel:** Reproduzierbares Mono-Repo mit funktionierendem Dev-Loop für Backend und Frontend.

### Aufgaben

- [ ] Repository initialisieren, `.gitignore`, `.editorconfig`
- [ ] npm-Workspaces konfigurieren (`backend/`, `frontend/`)
- [ ] Backend-Skeleton: Express, ESM, `pino`, Zod
- [ ] Frontend-Skeleton: Vite + React + TailwindCSS + React Router
- [ ] ESLint + Prettier (geteilte Config) + Husky + lint-staged
- [ ] `npm run dev` startet Backend + Frontend parallel (z. B. via `concurrently`)
- [ ] README-Grundgerüst, ARCHITECTURE-Skeleton, CHANGELOG, CONTRIBUTING
- [ ] `engines`-Feld in `package.json` (Node ≥ 20)

**Definition of Done:** Frischer Klon → `npm install && npm run dev` startet beide Apps fehlerfrei. Lint läuft grün.

---

## M2 — Datenbankschicht & Migrationen

**Ziel:** Tippsicherer DB-Zugriff mit Migrationsmechanismus und Seed-Daten.

**Abhängigkeit:** M1.

### Aufgaben

- [ ] `better-sqlite3` integrieren, WAL-Mode aktivieren
- [ ] Migrations-Runner (selbstgebaut, < 100 LoC, oder `node-pg-migrate`-Light-Variante)
- [ ] Migrationen 001–005: `members`, `drinks`, `drink_prices`, `bookings`, `audit_log`
- [ ] Seed-Skript mit Demo-Daten (Admin, 2 Mitglieder, 4 Getränke, Preise)
- [ ] Repository-Pattern: `MembersRepo`, `DrinksRepo`, `BookingsRepo`
- [ ] Backup-Skript (`scripts/backup-db.sh`) + Doku
- [ ] **Tests:** Unit-Tests für jedes Repo (in-memory SQLite via `:memory:`)

**Definition of Done:** `npm run db:migrate && npm run db:seed` legt eine konsistente DB an. Repos sind unit-getestet (≥ 80 % Coverage auf Repo-Layer).

---

## M3 — Authentifizierung & Sicherheit

**Ziel:** Funktionierender Login mit JWT, rollenbasierte Endpunkte, geschützte Routen.

**Abhängigkeit:** M2.

### Aufgaben

- [ ] `bcrypt`-Password-Hashing (cost factor 10)
- [ ] `POST /auth/login` mit Zod-Validierung
- [ ] JWT-Issuance (HS256, 8h), Secret aus ENV
- [ ] `auth`-Middleware + `requireRole`-Middleware
- [ ] `GET /auth/me`, `POST /auth/logout` (Token-Blocklist via SQLite)
- [ ] Rate-Limit auf `/auth/login` (5 Versuche / 15 Min / IP)
- [ ] Audit-Log-Einträge für Logins (Erfolg + Fehlschlag)
- [ ] **Tests:** Supertest-Integrationstests für Login-Flow (happy path, falsches PW, gesperrter User, Rate-Limit)

**Definition of Done:** Mit Postman/curl: Login → Token erhalten → Token an geschützten Endpunkt schicken → 200. Falsches Token → 401.

---

## M4 — API / Backend-Logik

**Ziel:** Vollständige REST-API für Mitglieder, Getränke und Buchungen.

**Abhängigkeit:** M3.

### Aufgaben

- [ ] `members`-Routen (CRUD, soft-delete)
- [ ] `drinks`-Routen + Preisverwaltung (`drink_prices`-Historie)
- [ ] `bookings`-Routen
  - [ ] `POST /bookings` — Preis-Snapshot zur Buchungszeit
  - [ ] `GET /bookings/me` mit Pagination (`?limit=50&before=<id>`)
  - [ ] `POST /bookings/:id/void` mit 5-Minuten-Fenster-Logik
  - [ ] `GET /bookings` (Admin) mit Filtern (Mitglied, Datum)
- [ ] Globaler Error-Handler (Zod-Errors → 400, AuthErrors → 401, etc.)
- [ ] OpenAPI-Spec (`docs/openapi.yaml`) generiert oder hand-gepflegt
- [ ] **Tests:** Supertest-Integrationstests pro Endpoint, Service-Layer mit Vitest

**Definition of Done:** Alle in `ARCHITECTURE.md` dokumentierten Endpunkte funktionieren, sind validiert und integrationsgetestet.

---

## M5 — Frontend (React)

**Ziel:** Mobilfreundliche UI für Mitglieder und Admins.

**Abhängigkeit:** M4 (Login-Screen kann ab M3 parallel entwickelt werden).

### Aufgaben

- [ ] API-Client mit Auth-Interceptor (Token aus `localStorage`)
- [ ] `AuthContext` + `ProtectedRoute`-Komponente
- [ ] **Login-Page** (Username + Passwort)
- [ ] **Buchungsseite** (Hauptscreen):
  - [ ] Große Buttons je Getränk, Tap = Buchung
  - [ ] Optimistic Update + Toast bei Erfolg/Fehler
  - [ ] Buchungshistorie der letzten 24h mit Storno-Button
- [ ] **Profilseite** (eigene Buchungen, Monatssumme)
- [ ] **Admin-Bereich** (eigene Route, nur für `role=admin`):
  - [ ] Mitglieder-Tabelle (anlegen, deaktivieren, PW zurücksetzen)
  - [ ] Getränke-Tabelle (anlegen, deaktivieren, Preis ändern)
  - [ ] Buchungs-Übersicht mit Filtern
  - [ ] Report-Download (Monat wählen, PDF/CSV)
- [ ] Responsive Design (Tailwind-Breakpoints, Touch-Targets ≥ 44px)
- [ ] Dark-Mode (optional, `prefers-color-scheme`)
- [ ] **Tests:** Vitest + React Testing Library für kritische Komponenten

**Definition of Done:** Vollständiger Klick-Pfad als Mitglied (Login → Buchen → Storno) und als Admin (Mitglied anlegen → Bericht herunterladen) funktioniert auf Mobile + Desktop.

---

## M6 — Reporting & Export (PDF/CSV)

**Ziel:** Monatsabrechnungen als PDF und CSV exportieren.

**Abhängigkeit:** M4.

### Aufgaben

- [ ] `ReportService.calculateMonthly(memberId, year, month)` — aggregiert Buchungen, gruppiert nach Getränk
- [ ] CSV-Export mit UTF-8-BOM (Excel-kompatibel), Spalten: Datum, Getränk, Anzahl, Einzelpreis, Gesamt
- [ ] PDF-Export via PDFKit:
  - [ ] Header mit Vereinsname + Logo (konfigurierbar)
  - [ ] Tabelle mit Buchungen
  - [ ] Summenzeile pro Getränk + Gesamtsumme
  - [ ] Footer mit Erstellungsdatum
- [ ] Endpunkt `GET /reports/monthly?...` mit `format`-Query (`pdf`|`csv`)
- [ ] „Alle Mitglieder“-Sammel-PDF (Mehrseitig, Inhaltsverzeichnis)
- [ ] **Tests:** Snapshot-Test auf CSV-Inhalt, Smoke-Test auf PDF-Größe + erstes Byte (`%PDF`)

**Definition of Done:** Admin lädt im UI eine Monatsabrechnung herunter, PDF öffnet korrekt, CSV importiert sauber in Excel/LibreOffice.

---

## M7 — CI/CD, Deployment & E2E-Tests

**Ziel:** Automatisches Build + Deploy auf den Raspberry Pi, abgesichert durch E2E-Tests.

**Abhängigkeit:** M5, M6.

### Aufgaben

- [ ] GitHub Actions Workflow `ci.yml` (auf jedem PR + Push):
  - [ ] Lint
  - [ ] Unit-Tests
  - [ ] Integrationstests
  - [ ] Build-Artefakt erzeugen
- [ ] GitHub Actions Workflow `deploy.yml` (auf Tag `v*`):
  - [ ] Self-Hosted Runner auf dem Pi nimmt das Artefakt
  - [ ] Backup der aktuellen DB
  - [ ] Atomic Swap (`/opt/getraenke/current` → `releases/<tag>`)
  - [ ] `systemctl restart getraenke.service`
  - [ ] Smoke-Test (`curl /health`)
- [ ] systemd-Unit-File (`scripts/getraenke.service`)
- [ ] Caddy/nginx als Reverse-Proxy mit lokalem TLS (optional)
- [ ] Playwright-E2E-Suite:
  - [ ] Login-Flow
  - [ ] Buchung erstellen + sehen
  - [ ] Storno innerhalb des Fensters
  - [ ] Admin: Mitglied anlegen
  - [ ] Admin: PDF-Report herunterladen (Header-Check)
- [ ] Deployment-Doku in `docs/DEPLOYMENT.md`
- [ ] Rollback-Prozedur dokumentiert

**Definition of Done:** Push eines Tags `v0.1.0` → Pipeline läuft grün → App ist live auf dem Pi → E2E-Smoke-Tests gegen die laufende Instanz sind grün.

---

## Rollen-Matrix (für Solo- oder Kleinteam-Setup)

| Rolle               | Verantwortung                                  |
|---------------------|------------------------------------------------|
| Tech Lead           | Architektur-Entscheidungen, PR-Reviews         |
| Backend Dev         | M2, M3, M4, M6                                 |
| Frontend Dev        | M5                                             |
| DevOps / Pi-Admin   | M1 (Tooling), M7                               |
| QA / Tester         | begleitend ab M3 (E2E-Skripte ab M5)           |

In einem Solo-Setup übernimmt eine Person alle Rollen — der Plan ändert sich nicht, aber die Zeitschätzungen verdoppeln sich realistisch.
