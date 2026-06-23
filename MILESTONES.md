# Milestones

Dieser Plan unterteilt das Projekt in 10 aufeinander aufbauende Meilensteine. Jeder Meilenstein liefert einen demonstrierbaren Mehrwert und kann in 3–7 Tagen abgeschlossen werden.

| #   | Titel                                         | Dauer (geschätzt) | Abhängigkeiten              |
| --- | --------------------------------------------- | ----------------- | --------------------------- |
| M1  | Projekt-Setup & Tooling                       | 2–3 Tage          | —                           |
| M2  | Datenbankschicht & Migrationen                | 2–3 Tage          | M1                          |
| M3  | Authentifizierung & Sicherheit                | 3–4 Tage          | M2                          |
| M4  | API / Backend-Logik                           | 5–7 Tage          | M3                          |
| M5  | Frontend (React)                              | 5–7 Tage          | M4 (parallel ab M3 möglich) |
| M6  | Reporting & Export (PDF/CSV)                  | 3–4 Tage          | M4                          |
| M7  | CI/CD, Deployment & E2E-Tests                 | 3–4 Tage          | M5, M6                      |
| M8  | Design System — Hängt!-Marke                  | 3–5 Tage          | M5                          |
| M9  | Allgemein-Konto & Mitglieder-Kategorien       | 3–5 Tage          | M4, M5                      |
| M10 | Erweitertes Mitglieder-Profil (Bild & E-Mail) | 3–4 Tage          | M3, M5, M7                  |

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

- [x] **`WordmarkHeader`** — Eiche-Holz-Streifen (`--eiche`), Wortmarke in Cormorant Garamond links, Aktiver-Kürzel rechts; sticky top-0
- [x] **`SaldoCard`** — Große Saldo-Anzeige, Hintergrund `--bg-card` (`#fbf3df`), 3px Korps-Rot-Topstreifen, `--sh-2`
- [x] **`SortenButton`** (Tally-Kachel) — Stempelartige Kachel je Getränkesorte; Press-Animation `scale(.985)` 150ms `--ease-stempel`; Loading-State via Spinner
- [x] **`StrichRow`** — Listenzeile Aktiver + TallyStrokes-SVG + Saldo, 1px `--line`-Trenner
- [x] **`Stepper`** (−/+ Mengen-Stepper) — Pill-Shape, Korps-Rot-Buttons, scale(.92) bei Press
- [x] **`TabBar`** — Bottom-Nav Mobile, Icons via Lucide (22px, `currentColor`), aktiver Tab in `--messing`
- [x] Bestehende generische Komponenten (`Toast`, `Spinner`, `Layout`) auf Marken-Tokens umstellen

#### Screens & UX-Text

- [x] **Login-Screen** — Sigel-Logo mittig, Cerevis-Name/Verbindung-Label statt „Username", Button-Text „Einloggen", kein „Welcome back 👋"
- [x] **Buchungsseite (Stube)** — Layout nach `ui_kits/app/index.html`: Saldo oben, Sorten-Kacheln darunter, History-Liste
- [x] **Profilseite (Mein Buch)** — Verlauf + Monatsabschluss, Typografie in Cormorant Garamond für Zitate/Summenzeilen
- [x] **Admin-Bereich** — Tabellen mit Hairline-Trennern (`--line`), keine Bootstrap-artigen Grau-Hintergründe, Eyebrow-Section-Titles mit 2px Korps-Rot-Linie darunter
- [x] UX-Texte komplett nach Hängt!-Tonalität überarbeiten (kein Englisch-Deutsch-Mix, kein Emoji, „Du"-Ansprache, Verbindungsvokabular — Beispiele in `project/README.md` § „Konkrete Beispiele")

#### Qualitätssicherung

- [x] Touch-Targets ≥ 44px auf allen interaktiven Elementen (insb. `SortenButton`, `TabBar`) — `WordmarkHeader`-Avatar auf 44×44px angehoben
- [x] Focus-States: 2px Outline `--korps-rot`, 2px Offset, kein Browser-Default — `outline: none` aus Admin-Inputs + WordmarkHeader entfernt; globales `:focus-visible` greift
- [x] Kein `backdrop-filter`/Blur in der UI — grep bestätigt: keine Vorkommen
- [x] Keine Gradienten außer Sepia-Vignette auf Foto-Hero — grep bestätigt: keine unerlaubten Gradienten
- [x] **Tests:** Accessibility-Check auf Farbkontraste — Korps-Rot auf Pergament 8,67:1 ✓, alle kritischen Paare ≥ 4,5:1 (WCAG AA). Playwright-Screenshot-Tests: in laufender App manuell zu prüfen (CI-Sandbox kann keine headed Browser starten)

**Definition of Done:** Die App sieht aus wie der Prototyp in `ui_kits/app/index.html`. Pergament-Hintergrund überall, Eiche-Header, Korps-Rot-CTAs, Caveat-Striche. Kein Default-Tailwind-Blau, keine Emojis, kein englischer UI-Text.

---

## M9 — Allgemein-Konto (Theken-Modus) & Mitglieder-Kategorien

**Ziel:** Ein gemeinsames „Allgemein"-Konto, von dem aus am Tresen für beliebige Mitglieder gebucht werden kann, sowie eine Einteilung aller Mitglieder in vier Korporations-Kategorien für eine übersichtliche Auswahl.

**Abhängigkeit:** M4 (Booking-API), M5 (Frontend).

### Festgelegte Entscheidungen

- Das Allgemein-Konto ist ein **normales Mitglied mit Zusatz-Flag** `can_book_for_others` — es erbt alle Member-Rechte, darf aber zusätzlich für andere buchen. Keine neue Rolle (passt zu „sonst gleiche Rechte wie ein normaler Nutzer").
- Die vier Kategorien sind eine **eigene Dimension** (`member_status`), unabhängig vom bestehenden `is_active`-Login-/Soft-Delete-Flag. Dadurch bleiben auch Mitglieder ohne Login (z. B. „Freunde der Verbindung") bebuchbar.
- Im Theken-Modus wählt man ein Mitglied, setzt **beliebig viele Striche** (inkl. Storno) und kehrt erst per **„Fertig"-Button** zur Übersicht zurück.

### Datenbank & Backend

- [ ] Migration 007: Spalte `member_status TEXT NOT NULL DEFAULT 'aktiv' CHECK (member_status IN ('aktiv','inaktiv','alter_herr','freund'))` an `members`
- [ ] Migration 007: Spalte `can_book_for_others INTEGER NOT NULL DEFAULT 0 CHECK (can_book_for_others IN (0,1))` an `members`
- [ ] Seed: „Allgemein"-Konto anlegen (`username='allgemein'`, `display_name='Allgemein'`, `role='member'`, `can_book_for_others=1`; Passwort wird von einem Admin gesetzt)
- [ ] `MembersRepo`: neue Felder lesen/schreiben; `findBookable()` — alle bebuchbaren Mitglieder, gruppierbar nach `member_status` (Allgemein-Konto + Admins ausgenommen)
- [ ] Zod-Schemas: `member_status` in Create-/Update-Member-Schema; `can_book_for_others` nur über Admin-Update setzbar
- [x] `POST /bookings` erweitern: optionales `member_id` im Body — wenn gesetzt, nur erlaubt wenn Requester `can_book_for_others=1` (sonst 403 `FORBIDDEN`); ohne `member_id` weiterhin Buchung für sich selbst
- [x] Buchungen eines bestimmten Mitglieds für den Theken-Screen ladbar machen (`GET /bookings/member/:id`; Allgemein-Konto darf fremde Buchungen lesen, beschränkt auf `member_id`-Filter)
- [x] `BookingService.void`: Konten mit `can_book_for_others` dürfen die von ihnen für andere angelegten Buchungen innerhalb des 5-Minuten-Fensters stornieren (über neue Spalte `booked_by_id`, Migration 008)
- [x] Audit-Log: `booking_created`/`booking_voided` halten `actor_id` (Allgemein-Konto) **und** Ziel-`member_id` fest („auf wen wurde gebucht")
- [x] **Tests:** Supertest — Buchen für anderes Mitglied als Allgemein-Konto (201), als normales Member (403), Lesen fremder Buchungen; Vitest — Repo-Felder, Service-Authz, Storno durch Allgemein-Konto

### Frontend

- [x] `AuthContext`/`GET /auth/me` liefern `can_book_for_others`
- [x] Routing: bei `can_book_for_others` rendert `/buchen` den **Theken-Flow** statt der normalen Stube; normale Mitglieder/Admins unverändert
- [x] **Mitglieder-Übersicht** (`MemberSelectView`): vier Abschnitte „Aktive", „Inaktive", „Alte Herren", „Freunde der Verbindung" mit Eyebrow-Section-Titles (Korps-Rot-Linie), große Touch-Kacheln je Mitglied (≥ 44px), Such-/Filterfeld
- [x] **Mitglieder-Buchungsansicht** (`MemberBookingView`): gewähltes Mitglied + Monats-Saldo oben, Sorten-Kacheln (Reuse `SortenButton`), Strich-Historie des Mitglieds mit Storno, prominenter **„Fertig"-Button** zurück zur Übersicht
- [x] `bookingsApi.createForMember(memberId, drinkId)` + `getForMember(memberId)`
- [x] `GET /members/bookable`: bebuchbare Mitglieder für Konten mit `can_book_for_others` (ohne Admin-Recht)
- [x] Admin `MembersPage`: Spalte/Editor für `member_status` (Dropdown), Toggle `can_book_for_others`
- [x] Konsistent mit Hängt!-Tokens (Pergament, Eiche-Header, Caveat-Striche) — kein neuer visueller Stil
- [x] **Tests:** Vitest + RTL — Gruppierung der Übersicht nach Kategorie, Flow Auswahl → Buchen → „Fertig" → zurück

### E2E & Doku

- [x] Playwright-E2E: Login als Allgemein-Konto → Mitglied aus Kategorie wählen → Strich setzen → Storno → „Fertig" → zurück zur Übersicht; Test-Seed um Allgemein-Konto + kategorisierte Mitglieder erweitert
- [x] `ARCHITECTURE.md`: neue Spalten, Endpunkt-Änderungen, Theken-Modus dokumentiert
- [x] `CHANGELOG.md`: nutzersichtbare Änderungen unter [Unreleased] gepflegt

**Definition of Done:** Login als „Allgemein" zeigt die nach vier Kategorien gruppierte Mitgliederübersicht. Auswahl eines Mitglieds → Striche setzen (mehrere möglich, Storno möglich) → „Fertig" → zurück zur Übersicht. Normale Mitglieder und Admins sehen unverändert ihre eigene Stube. Buchungen für andere sind im Audit-Log dem Allgemein-Konto zugeordnet. Lint, Unit-, Integrations- und E2E-Tests grün.

---

## M10 — Erweitertes Mitglieder-Profil (Profilbild & E-Mail)

**Ziel:** Das Mitglieder-Profil um ein **Profilbild** und eine **E-Mail-Adresse** erweitern. Beide Felder sind pflegbar — vom Mitglied selbst (Self-Service) und zusätzlich von Admins. Die E-Mail-Verifizierung ist bewusst **nicht** Teil von M10, sondern als eigener späterer Milestone vorgesehen (siehe Hinweis am Ende).

**Abhängigkeit:** M3 (Auth), M5 (Frontend), M7 (Deployment — StateDirectory für Bilddateien).

### Festgelegte Entscheidungen

- **Pflege durch Mitglied selbst + Admin.** Bisher gibt es keinen Self-Service — Mitglieder können nichts an sich ändern. M10 führt daher einen geschützten Self-Service-Endpunkt ein (`PATCH /auth/me`); Admins behalten den vollen Zugriff über `PATCH /members/:id`.
- **Profilbild im Dateisystem des Pi**, nicht als BLOB in SQLite. Dateien liegen unter dem `StateDirectory` (`/var/lib/getraenke/avatars/`), die DB hält nur den Pfad/Dateinamen. Auslieferung über eine statische Route. Vorteil: schlanke DB, effiziente Auslieferung; Backup muss den Ordner mitnehmen (Doku-Punkt).
- **E-Mail optional**, aber **eindeutig wenn gesetzt** (case-insensitive, `COLLATE NOCASE`) — damit eine spätere Verifizierung/Passwort-Reset-Funktion sauber daran anknüpfen kann.
- **Keine E-Mail-Verifizierung in M10.** Die Adresse wird nur gespeichert/gepflegt; ein „verifiziert"-Status kommt später (kein SMTP-Versand in diesem Milestone nötig).

### Datenbank & Backend

- [x] Migration 009: Spalte `email TEXT` an `members` (nullable, `COLLATE NOCASE`); partieller `UNIQUE`-Index nur für gesetzte Werte (`CREATE UNIQUE INDEX … WHERE email IS NOT NULL`)
- [x] Migration 009: Spalte `avatar_path TEXT` an `members` (nullable; relativer Dateiname im Avatar-Verzeichnis)
- [x] `MembersRepo`: `email`/`avatar_path` lesen/schreiben; `findByEmail()` für Eindeutigkeitsprüfung
- [x] Zod-Schemas: E-Mail-Format-Validierung (optional, trim, lowercase) im Create-/Update-Member-Schema **und** im neuen Self-Service-Schema
- [x] **Self-Service-Endpunkt** `PATCH /auth/me`: eingeloggtes Mitglied ändert eigene `email` (Konflikt → 409 `EMAIL_TAKEN`); Audit-Log-Eintrag
- [x] **Avatar-Upload** `POST /auth/me/avatar` (multipart, `multer`, 5 MB-Limit): Bild via `sharp` auf 256×256 WebP normalisieren, unter `AVATAR_DIR` speichern; `DELETE /auth/me/avatar` entfernt das Bild
- [ ] Admin-Pendants: `PATCH /members/:id` akzeptiert zusätzlich `email`; Avatar-Verwaltung für beliebige Mitglieder (`POST/DELETE /members/:id/avatar`) _(verschoben auf späteren PR)_
- [x] **Statische Auslieferung** der Avatare (`GET /avatars/:file` via `express.static`)
- [x] Konfiguration: ENV-Variable `AVATAR_DIR` (Dev: `./data/avatars`, Prod: `/var/lib/getraenke/avatars`)
- [x] **Tests:** Supertest — `PATCH /auth/me` (200, E-Mail-Konflikt 409, 400 leerer Body, 401), Avatar-Upload (200, 400 keine Datei, 401), Avatar-Delete (200, idempotent, 401); Vitest — Repo-Eindeutigkeit

### Frontend

- [x] `PublicMember`-Typ + API-Client um `email` und `avatar_path` erweitert; `apiUpload()` für Multipart
- [x] `ProfilePage`: E-Mail anzeigen und bearbeiten, Profilbild hochladen/entfernen, Avatar-Kreis mit Initialen-Fallback
- [ ] Echtes Profilbild im `Layout`/`WordmarkHeader` _(verschoben auf späteren PR)_
- [ ] Admin `MembersPage`: E-Mail-Spalte/Editor _(verschoben auf späteren PR)_
- [x] Konsistent mit Hängt!-Tokens — kein neuer visueller Stil

### E2E & Doku

- [x] Playwright-E2E `07-profil`: E-Mail setzen + in Karte sehen, Profilbild hochladen + Avatar erscheint, Konflikt-Toast bei doppelter E-Mail
- [x] `ARCHITECTURE.md`: neue Spalten (`email`, `avatar_path`), Self-Service-/Avatar-Endpunkte, Datei-Speicher-Entscheidung dokumentiert
- [ ] `docs/DEPLOYMENT.md`: Avatar-Verzeichnis im `StateDirectory` + Backup-Hinweis _(verschoben auf M10 Follow-up)_
- [x] `CHANGELOG.md`: nutzersichtbare Änderungen unter [Unreleased] gepflegt

**Definition of Done:** Ein eingeloggtes Mitglied kann im Profil seine E-Mail-Adresse setzen/ändern und ein Profilbild hoch- und wieder abladen; das Bild erscheint im Header (Fallback: Initialen). Admins können dieselben Felder für beliebige Mitglieder pflegen. E-Mail-Adressen sind eindeutig. Bilddateien liegen im `StateDirectory` und überleben Deployments. Lint, Unit-, Integrations- und E2E-Tests grün.

> **Späterer Milestone — E-Mail-Verifizierung:** Setzt einen Versandweg voraus. Empfehlung für das Pi-Setup: **kein** Direktversand vom Pi (Deliverability/Spam), sondern ein externer SMTP-Relay/Transaktionsdienst — z. B. Brevo oder Mailgun (Free-Tier, SMTP) oder das Postfach des Vereinsproviders bzw. Gmail-SMTP mit App-Passwort. Technik dann: `nodemailer` + SMTP-Credentials in ENV, Spalte `email_verified_at`, einmaliger ablaufender Token (gehasht gespeichert), Bestätigungs-Endpunkt `GET /auth/verify-email?token=…` mit konfigurierter Basis-URL, Resend-Flow + Rate-Limit.

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
