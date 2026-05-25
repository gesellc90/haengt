# Milestones

Dieser Plan unterteilt das Projekt in 7 aufeinander aufbauende Meilensteine. Jeder Meilenstein liefert einen demonstrierbaren Mehrwert und kann in 3–7 Tagen abgeschlossen werden.

| #   | Titel                          | Dauer (geschätzt) | Abhängigkeiten              |
| --- | ------------------------------ | ----------------- | --------------------------- |
| M1  | Projekt-Setup & Tooling        | 2–3 Tage          | —                           |
| M2  | Datenbankschicht & Migrationen | 2–3 Tage          | M1                          |
| M3  | Authentifizierung & Sicherheit | 3–4 Tage          | M2                          |
| M4  | API / Backend-Logik            | 5–7 Tage          | M3                          |
| M5  | Frontend (React)               | 5–7 Tage          | M4 (parallel ab M3 möglich) |
| M6  | Reporting & Export (PDF/CSV)   | 3–4 Tage          | M4                          |
| M7  | CI/CD, Deployment & E2E-Tests  | 3–4 Tage          | M5, M6                      |
| M8  | Design System — Hängt!-Marke  | 3–5 Tage          | M5                          |

---

## M1 — Projekt-Setup & Tooling

**Ziel:** Reproduzierbares Mono-Repo mit funktionierendem Dev-Loop für Backend und Frontend.

### Aufgaben

- [x] Repository initialisieren, `.gitignore`, `.editorconfig`
- [x] npm-Workspaces konfigurieren (`backend/`, `frontend/`)
- [x] Backend-Skeleton: Express, ESM, `pino`, Zod
- [x] Frontend-Skeleton: Vite + React + TailwindCSS + React Router
- [x] ESLint + Prettier (geteilte Config) + Husky + lint-staged
- [x] `npm run dev` startet Backend + Frontend parallel (z. B. via `concurrently`)
- [x] README-Grundgerüst, ARCHITECTURE-Skeleton, CHANGELOG, CONTRIBUTING
- [x] `engines`-Feld in `package.json` (Node ≥ 20)

**Definition of Done:** Frischer Klon → `npm install && npm run dev` startet beide Apps fehlerfrei. Lint läuft grün.

---

## M2 — Datenbankschicht & Migrationen

**Ziel:** Tippsicherer DB-Zugriff mit Migrationsmechanismus und Seed-Daten.

**Abhängigkeit:** M1.

### Aufgaben

- [x] `better-sqlite3` integrieren, WAL-Mode aktivieren
- [x] Migrations-Runner (selbstgebaut, < 100 LoC, oder `node-pg-migrate`-Light-Variante)
- [x] Migrationen 001–005: `members`, `drinks`, `drink_prices`, `bookings`, `audit_log`
- [x] Seed-Skript mit Demo-Daten (Admin, 2 Mitglieder, 4 Getränke, Preise)
- [x] Repository-Pattern: `MembersRepo`, `DrinksRepo`, `BookingsRepo`
- [x] Backup-Skript (`scripts/backup-db.sh`) + Doku
- [x] **Tests:** Unit-Tests für jedes Repo (in-memory SQLite via `:memory:`)

**Definition of Done:** `npm run db:migrate && npm run db:seed` legt eine konsistente DB an. Repos sind unit-getestet (≥ 80 % Coverage auf Repo-Layer).

---

## M3 — Authentifizierung & Sicherheit

**Ziel:** Funktionierender Login mit JWT, rollenbasierte Endpunkte, geschützte Routen.

**Abhängigkeit:** M2.

### Aufgaben

- [x] `bcrypt`-Password-Hashing (cost factor 10) — `bcryptjs` mit Timing-Safe-Dummy-Vergleich
- [x] `POST /auth/login` mit Zod-Validierung
- [x] JWT-Issuance (HS256, 8h), Secret aus ENV
- [x] `auth`-Middleware + `requireRole`-Middleware
- [x] `GET /auth/me`, `POST /auth/logout` (Token-Blocklist via SQLite, JTI-basiert)
- [x] Rate-Limit auf `/auth/login` (5 Versuche / 15 Min / IP)
- [x] Audit-Log-Einträge für Logins (Erfolg + Fehlschlag)
- [x] **Tests:** Supertest-Integrationstests für Login-Flow (happy path, falsches PW, gesperrter User, Rate-Limit)

**Definition of Done:** Mit Postman/curl: Login → Token erhalten → Token an geschützten Endpunkt schicken → 200. Falsches Token → 401.

---

## M4 — API / Backend-Logik

**Ziel:** Vollständige REST-API für Mitglieder, Getränke und Buchungen.

**Abhängigkeit:** M3.

### Aufgaben

- [x] `members`-Routen (CRUD, soft-delete)
- [x] `drinks`-Routen + Preisverwaltung (`drink_prices`-Historie)
- [x] `bookings`-Routen
  - [x] `POST /bookings` — Preis-Snapshot zur Buchungszeit
  - [x] `GET /bookings/me` mit Pagination (`?limit=50&before=<id>`)
  - [x] `POST /bookings/:id/void` mit 5-Minuten-Fenster-Logik
  - [x] `GET /bookings` (Admin) mit Filtern (Mitglied, Datum)
- [x] Globaler Error-Handler (Zod-Errors → 400, AuthErrors → 401, etc.)
- [x] OpenAPI-Spec (`docs/openapi.yaml`) generiert oder hand-gepflegt
- [x] **Tests:** Supertest-Integrationstests pro Endpoint, Service-Layer mit Vitest

**Definition of Done:** Alle in `ARCHITECTURE.md` dokumentierten Endpunkte funktionieren, sind validiert und integrationsgetestet.

---

## M5 — Frontend (React)

**Ziel:** Mobilfreundliche UI für Mitglieder und Admins.

**Abhängigkeit:** M4 (Login-Screen kann ab M3 parallel entwickelt werden).

### Aufgaben

- [x] API-Client mit Auth-Interceptor (Token aus `localStorage`)
- [x] `AuthContext` + `ProtectedRoute`-Komponente
- [x] **Login-Page** (Username + Passwort)
- [x] **Buchungsseite** (Hauptscreen):
  - [x] Große Buttons je Getränk, Tap = Buchung
  - [x] Optimistic Update + Toast bei Erfolg/Fehler
  - [x] Buchungshistorie der letzten 24h mit Storno-Button
- [x] **Profilseite** (eigene Buchungen, Monatssumme)
- [x] **Admin-Bereich** (eigene Route, nur für `role=admin`):
  - [x] Mitglieder-Tabelle (anlegen, deaktivieren, PW zurücksetzen)
  - [x] Getränke-Tabelle (anlegen, deaktivieren, Preis ändern)
  - [x] Buchungs-Übersicht mit Filtern
  - [x] Report-Download (Monat wählen, PDF/CSV)
- [x] Responsive Design (Tailwind-Breakpoints, Touch-Targets ≥ 44px)
- [ ] Dark-Mode (optional, `prefers-color-scheme`)
- [x] **Tests:** Vitest + React Testing Library für kritische Komponenten

**Definition of Done:** Vollständiger Klick-Pfad als Mitglied (Login → Buchen → Storno) und als Admin (Mitglied anlegen → Bericht herunterladen) funktioniert auf Mobile + Desktop.

---

## M6 — Reporting & Export (PDF/CSV)

**Ziel:** Monatsabrechnungen als PDF und CSV exportieren.

**Abhängigkeit:** M4.

### Aufgaben

- [x] `ReportService.calculateMonthly(memberId, year, month)` — aggregiert Buchungen, gruppiert nach Getränk
- [x] CSV-Export mit UTF-8-BOM (Excel-kompatibel), Spalten: Datum, Getränk, Anzahl, Einzelpreis, Gesamt
- [x] PDF-Export via PDFKit:
  - [x] Header mit Vereinsname + Logo (konfigurierbar)
  - [x] Tabelle mit Buchungen
  - [x] Summenzeile pro Getränk + Gesamtsumme
  - [x] Footer mit Erstellungsdatum
- [x] Endpunkt `GET /reports/monthly?...` mit `format`-Query (`pdf`|`csv`)
- [x] „Alle Mitglieder”-Sammel-PDF (Mehrseitig, Inhaltsverzeichnis)
- [x] **Tests:** Snapshot-Test auf CSV-Inhalt, Smoke-Test auf PDF-Größe + erstes Byte (`%PDF`)

**Definition of Done:** Admin lädt im UI eine Monatsabrechnung herunter, PDF öffnet korrekt, CSV importiert sauber in Excel/LibreOffice.

---

## M7 — CI/CD, Deployment & E2E-Tests

**Ziel:** Automatisches Build + Deploy auf den Raspberry Pi, abgesichert durch E2E-Tests.

**Abhängigkeit:** M5, M6.

### Aufgaben

- [x] GitHub Actions Workflow `ci.yml` (auf jedem PR + Push):
  - [x] Lint
  - [x] Unit-Tests
  - [x] Integrationstests
  - [x] Build-Artefakt erzeugen
- [x] GitHub Actions Workflow `deploy.yml` (auf Tag `v*`):
  - [x] Self-Hosted Runner auf dem Pi nimmt das Artefakt
  - [x] Backup der aktuellen DB
  - [x] Atomic Swap (`/opt/getraenke/current` → `releases/<tag>`)
  - [x] `systemctl restart getraenke.service`
  - [x] Smoke-Test (`curl /health`)
- [x] systemd-Unit-File (`scripts/getraenke.service`)
- [ ] Caddy/nginx als Reverse-Proxy mit lokalem TLS (optional)
- [x] Playwright-E2E-Suite:
  - [x] Login-Flow
  - [x] Buchung erstellen + sehen
  - [x] Storno innerhalb des Fensters
  - [x] Admin: Mitglied anlegen
  - [x] Admin: PDF-Report herunterladen (Header-Check)
- [x] Deployment-Doku in `docs/DEPLOYMENT.md`
- [x] Rollback-Prozedur dokumentiert

**Definition of Done:** Push eines Tags `v0.1.0` → Pipeline läuft grün → App ist live auf dem Pi → E2E-Smoke-Tests gegen die laufende Instanz sind grün.

---

## M8 — Design System — Hängt!-Marke

**Ziel:** Das bestehende Frontend konsequent auf das Hängt!-Design System umstellen — Pergament-Ästhetik, Verbindungs-Typografie, Marken-Tokens und passende Komponenten.

**Abhängigkeit:** M5.  
**Quelle:** `h-ngt-design-system/` — alle Tokens, Komponenten und Screens sind als HTML-Prototyp vorhanden. Vor der Implementierung `h-ngt-design-system/project/README.md` sowie `colors_and_type.css` und `ui_kits/app/index.html` vollständig lesen.

### Aufgaben

#### Design-Tokens & Basis

- [x] `colors_and_type.css` aus dem Design-Bundle als `frontend/src/styles/tokens.css` übernehmen (alle `--*`-Variablen: Farben, Typo, Spacing, Radien, Schatten)
- [x] Google Fonts laden: **Cinzel**, **Cormorant Garamond**, **Manrope**, **Caveat** (via `<link>` in `index.html`)
- [x] Tailwind-Config auf Design-Tokens ausrichten (`tailwind.config.ts`): `colors`, `fontFamily`, `borderRadius`, `boxShadow` aus den CSS-Variablen ableiten
- [x] Globales CSS-Reset: Hintergrund auf `--bg-pergament` (`#f4ead5`), Textfarbe auf `--tinte` (`#1a120b`), Browser-Blau-Focus-Outline deaktivieren → durch Korps-Rot-Outline ersetzen

#### Komponenten (nach Design-Prototyp)

- [ ] **`WordmarkHeader`** — Eiche-Holz-Streifen (`--eiche`), Wortmarke in Cinzel links, Aktiver-Kürzel rechts; Höhe 56px Mobile / 64px Desktop
- [ ] **`SaldoCard`** — Große Saldo-Anzeige, Hintergrund `--bg-card` (`#fbf3df`), 2px Korps-Rot-Linie oben, `--sh-2` + `--sh-emboss`
- [ ] **`SortenButton`** (Tally-Kachel) — Stempelartige Kachel je Getränkesorte; Press-Animation `scale(.985)` 120ms `--ease-stempel`; Strich-Animation via SVG `stroke-dasharray` in Caveat-Font (240ms)
- [ ] **`StrichRow`** — Listenzeile Aktiver + Tally-Zähler in Caveat + Saldo, 1px `--line`-Trenner
- [ ] **`Stepper`** (−/+ Mengen-Stepper) — Kantige Buttons (`--r-2`), Inset-Emboss
- [ ] **`TabBar`** — Bottom-Nav Mobile, Icons via Lucide (20px, `currentColor`), kein blaues Highlight, aktiver Tab in Korps-Rot
- [ ] Bestehende generische Komponenten (`Toast`, `Spinner`, `Layout`) auf Marken-Tokens umstellen

#### Screens & UX-Text

- [ ] **Login-Screen** — Sigel-Logo mittig, Cerevis-Name/Verbindung-Label statt „Username", Button-Text „Einloggen", kein „Welcome back 👋"
- [ ] **Buchungsseite (Stube)** — Layout nach `ui_kits/app/index.html`: Saldo oben, Sorten-Kacheln darunter, History-Liste
- [ ] **Profilseite (Mein Buch)** — Verlauf + Monatsabschluss, Typografie in Cormorant Garamond für Zitate/Summenzeilen
- [ ] **Admin-Bereich** — Tabellen mit Hairline-Trennern (`--line`), keine Bootstrap-artigen Grau-Hintergründe, Eyebrow-Section-Titles mit 2px Korps-Rot-Linie darunter
- [ ] UX-Texte komplett nach Hängt!-Tonalität überarbeiten (kein Englisch-Deutsch-Mix, kein Emoji, „Du"-Ansprache, Verbindungsvokabular — Beispiele in `project/README.md` § „Konkrete Beispiele")

#### Qualitätssicherung

- [ ] Touch-Targets ≥ 44px auf allen interaktiven Elementen (insb. `SortenButton`, `TabBar`)
- [ ] Focus-States: 2px Outline `--korps-rot`, 2px Offset, kein Browser-Default
- [ ] Kein `backdrop-filter`/Blur in der UI
- [ ] Keine Gradienten außer Sepia-Vignette auf Foto-Hero
- [ ] **Tests:** Visuelle Regressionstests auf Login, Stube und Admin-Startseite (z.B. Playwright-Screenshot-Diff); Accessibility-Check auf Farbkontraste (Korps-Rot auf Pergament ≥ 4.5:1)

**Definition of Done:** Die App sieht aus wie der Prototyp in `ui_kits/app/index.html`. Pergament-Hintergrund überall, Eiche-Header, Korps-Rot-CTAs, Caveat-Striche. Kein Default-Tailwind-Blau, keine Emojis, kein englischer UI-Text.

---

## Rollen-Matrix (für Solo- oder Kleinteam-Setup)

| Rolle             | Verantwortung                          |
| ----------------- | -------------------------------------- |
| Tech Lead         | Architektur-Entscheidungen, PR-Reviews |
| Backend Dev       | M2, M3, M4, M6                         |
| Frontend Dev      | M5                                     |
| DevOps / Pi-Admin | M1 (Tooling), M7                       |
| QA / Tester       | begleitend ab M3 (E2E-Skripte ab M5)   |

In einem Solo-Setup übernimmt eine Person alle Rollen — der Plan ändert sich nicht, aber die Zeitschätzungen verdoppeln sich realistisch.
