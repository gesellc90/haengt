# Architecture

## Übersicht

Die Anwendung folgt einer klassischen Drei-Schichten-Architektur, deployed als Single-Node-System auf einem Raspberry Pi.

```
┌────────────────────┐      HTTP/JSON      ┌──────────────────────┐      SQL       ┌──────────────┐
│  React SPA (Vite)  │ ──────────────────▶ │  Express REST API    │ ─────────────▶ │  SQLite DB   │
│  TailwindCSS       │ ◀────────────────── │  JWT-Auth, Zod       │ ◀───────────── │  WAL-Mode    │
└────────────────────┘                     └──────────────────────┘                └──────────────┘
        │                                            │
        └──── statisch ausgeliefert von Express (in Produktion) ────┘
```

In Produktion liefert Express auch das gebuildete Frontend aus (`dist/`), sodass nur ein Port (`3001`) im Vereins-WLAN exponiert werden muss.

## Tech-Stack

### Backend

- **Node.js 20 LTS** — moderne ES-Module, native Test-Runner verfügbar
- **TypeScript 5** — `strict: true`; Dev über `tsx watch`, Prod-Build über `tsc` nach `dist/`
- **Express 4** — schlankes, weit verbreitetes Web-Framework
- **better-sqlite3** — synchrone SQLite-Bibliothek, deutlich schneller als `node-sqlite3` für embedded Use-Cases
- **Zod** — Schema-Validierung für Request-Bodies und ENV
- **jsonwebtoken + bcrypt** — Auth
- **pino** — strukturiertes Logging
- **PDFKit** — PDF-Erzeugung für Monatsabrechnungen

### Frontend

- **React 18** mit Hooks
- **TypeScript 5** — Vite-Template `react-ts`
- **Vite** — Build-Tool, schnelles HMR
- **React Router** — Client-Side Routing
- **TanStack Query** — Server-State-Management
- **TailwindCSS** — Utility-First Styling
- **react-hook-form + Zod** — Formulare mit Validierung

### Datenhaltung

SQLite im **WAL-Mode** (Write-Ahead-Logging) für bessere Lese-Performance bei gleichzeitigen Buchungen. Datenbank-Datei liegt unter `backend/data/getraenke.db` (Dev) bzw. `/var/lib/getraenke/getraenke.db` (Prod).

## Datenbankschema

```sql
-- Mitglieder (Vereinsmitglieder + Admins)
CREATE TABLE members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('member', 'admin')),
    active          INTEGER NOT NULL DEFAULT 1,
    -- Verbindungs-Kategorie, unabhängig von active (Login/Soft-Delete)
    member_status       TEXT NOT NULL DEFAULT 'aktiv'
        CHECK (member_status IN ('aktiv', 'inaktiv', 'alter_herr', 'freund')),
    -- 1 = darf für beliebige andere Mitglieder buchen (Theken-/Allgemein-Konto)
    can_book_for_others INTEGER NOT NULL DEFAULT 0 CHECK (can_book_for_others IN (0, 1)),
    -- optional, eindeutig wenn gesetzt (case-insensitive), Basis für späteren Passwort-Reset
    email           TEXT COLLATE NOCASE,
    -- relativer Dateiname im Avatar-Verzeichnis (z. B. "42.webp"); NULL = kein Bild
    avatar_path     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Partieller UNIQUE-Index: NULLs sind ausgenommen (SQLite-Semantik)
CREATE UNIQUE INDEX idx_members_email ON members (email) WHERE email IS NOT NULL;

-- Getränke-Katalog
CREATE TABLE drinks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    active          INTEGER NOT NULL DEFAULT 1,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Preis-Historie (nie überschreiben → nachvollziehbare Abrechnung)
CREATE TABLE drink_prices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    drink_id        INTEGER NOT NULL REFERENCES drinks(id) ON DELETE CASCADE,
    price_cents     INTEGER NOT NULL CHECK(price_cents >= 0),
    valid_from      TEXT NOT NULL,
    valid_to        TEXT
);
CREATE INDEX idx_drink_prices_lookup ON drink_prices(drink_id, valid_from);

-- Buchungen (Append-Only, Stornierung über `voided_at`)
CREATE TABLE bookings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id       INTEGER NOT NULL REFERENCES members(id),
    drink_id        INTEGER NOT NULL REFERENCES drinks(id),
    quantity        INTEGER NOT NULL CHECK(quantity > 0),
    unit_price_cents INTEGER NOT NULL,        -- Preis-Snapshot zum Buchungszeitpunkt
    total_cents     INTEGER NOT NULL,
    booked_at       TEXT NOT NULL DEFAULT (datetime('now')),
    voided_at       TEXT,
    voided_by       INTEGER REFERENCES members(id),
    booked_by_id    INTEGER REFERENCES members(id) ON DELETE SET NULL  -- wer gebucht hat; NULL = Selbstbuchung
);
CREATE INDEX idx_bookings_member_month ON bookings(member_id, booked_at);

-- Audit-Log für sicherheitsrelevante Aktionen
CREATE TABLE audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id        INTEGER REFERENCES members(id),
    action          TEXT NOT NULL,
    entity          TEXT,
    entity_id       INTEGER,
    payload_json    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Designentscheidungen

- **Preise in Cents als INTEGER** — vermeidet Float-Rundungsfehler.
- **Append-Only Buchungen** — keine `DELETE`s, Stornierungen über `voided_at`. Macht Abrechnungen nachvollziehbar.
- **Preis-Snapshot in `bookings.unit_price_cents`** — damit nachträgliche Preisänderungen alte Abrechnungen nicht verfälschen.
- **`drink_prices` mit Gültigkeitszeitraum** — wenn man den jeweils aktuellen Preis lookup'en muss (z. B. UI), ist das zeitabhängig korrekt.
- **Theken-/Allgemein-Konto (`can_book_for_others`)** — ein Konto mit gesetztem Flag bucht stellvertretend für andere. Das Frontend schaltet nach dem Login allein anhand dieses Flags zwischen der eigenen Stube (`BookingPage`) und der nach `member_status` gruppierten Theken-Übersicht (`ThekePage`) um. Damit die Umschaltung schon unmittelbar nach dem Login greift, liefern sowohl `/auth/login` als auch `/auth/me` das vollständige `PublicMember`-Objekt (inkl. `can_book_for_others`, ohne `password_hash`).
- **Profilbilder im Dateisystem** — Avatare liegen unter `AVATAR_DIR` (Dev: `./data/avatars`, Prod: `/var/lib/getraenke/avatars/`), die DB hält nur den Dateinamen. Upload via `multer` → Normalisierung durch `sharp` (256×256, WebP, Q85). Auslieferung über `GET /avatars/:file` (express.static). Das Verzeichnis muss ins Deployment-Backup aufgenommen werden.

## API-Übersicht

Basis-URL: `/api/v1`. Alle geschützten Endpunkte erwarten `Authorization: Bearer <jwt>`.

### Auth

| Methode | Pfad              | Auth | Beschreibung                                      |
| ------- | ----------------- | ---- | ------------------------------------------------- |
| POST    | `/auth/login`     | —    | Login mit Username + Passwort                     |
| POST    | `/auth/logout`    | User | Token serverseitig invalidieren                   |
| GET     | `/auth/me`        | User | Aktuelles Profil (vollständiges `PublicMember`)   |
| PATCH   | `/auth/me`        | User | Eigenen Anzeigenamen, E-Mail oder Passwort ändern |
| POST    | `/auth/me/avatar` | User | Profilbild hochladen (max 5 MB → 256×256 WebP)    |
| DELETE  | `/auth/me/avatar` | User | Profilbild entfernen                              |

### Mitglieder

| Methode | Pfad                | Auth  | Beschreibung                                                 |
| ------- | ------------------- | ----- | ------------------------------------------------------------ |
| GET     | `/members`          | Admin | Alle Mitglieder                                              |
| POST    | `/members`          | Admin | Neues Mitglied anlegen                                       |
| GET     | `/members/bookable` | User  | Bebuchbare Mitglieder (nur Konten mit `can_book_for_others`) |
| GET     | `/members/:id`      | Admin | Einzelnes Mitglied                                           |
| PATCH   | `/members/:id`      | Admin | Mitglied aktualisieren                                       |
| DELETE  | `/members/:id`      | Admin | Mitglied deaktivieren (soft)                                 |

### Getränke

| Methode | Pfad                 | Auth  | Beschreibung             |
| ------- | -------------------- | ----- | ------------------------ |
| GET     | `/drinks`            | User  | Aktive Getränke + Preise |
| POST    | `/drinks`            | Admin | Neues Getränk anlegen    |
| PATCH   | `/drinks/:id`        | Admin | Getränk aktualisieren    |
| POST    | `/drinks/:id/prices` | Admin | Neuen Preis setzen       |

### Buchungen

| Methode | Pfad                   | Auth  | Beschreibung                                                                   |
| ------- | ---------------------- | ----- | ------------------------------------------------------------------------------ |
| POST    | `/bookings`            | User  | Buchung anlegen; optional `member_id` (nur Konten mit `can_book_for_others`)   |
| GET     | `/bookings/me`         | User  | Eigene Buchungen (paginiert)                                                   |
| GET     | `/bookings/member/:id` | User  | Buchungen eines Mitglieds; fremde nur mit `can_book_for_others`                |
| POST    | `/bookings/:id/void`   | User  | Eigene Buchung stornieren (≤ 5min); Allgemein-Konto auch eigene Fremdbuchungen |
| GET     | `/bookings`            | Admin | Alle Buchungen mit Filter                                                      |

### Reports

| Methode | Pfad                                             | Auth  | Beschreibung                |
| ------- | ------------------------------------------------ | ----- | --------------------------- |
| GET     | `/reports/monthly?year=YYYY&month=MM&format=pdf` | Admin | PDF-Monatsabrechnung (alle) |
| GET     | `/reports/monthly?...&format=csv`                | Admin | CSV-Export                  |
| GET     | `/reports/monthly/:memberId?...`                 | Admin | Pro Mitglied                |

## Auth-Flow

1. Frontend POSTet Credentials an `/auth/login`.
2. Backend prüft `password_hash` per `bcrypt.compare`, generiert JWT (HS256, 8h Gültigkeit, Payload: `{ sub, role }`).
3. Frontend speichert Token in `localStorage` (akzeptabel im internen Vereins-WLAN; Trade-off bewusst gegenüber Session-Cookies).
4. `auth`-Middleware verifiziert Token, lädt Mitglied aus DB, hängt es an `req.user`.
5. `requireRole('admin')`-Middleware schützt Admin-Endpunkte.

## Sicherheitsannahmen

- **Vertrauenswürdiges Netz**: Nur im Vereins-WLAN erreichbar. Trotzdem: HTTPS via selbstsigniertes Zertifikat oder Caddy-Reverse-Proxy empfohlen.
- **Brute-Force-Schutz**: Rate-Limiting auf `/auth/login` (5 Versuche / 15 Min / IP).
- **Input-Validierung**: Zod-Schemas auf jedem Endpoint.
- **SQL-Injection**: Ausschließlich Prepared Statements (better-sqlite3 enforces es).
- **Backups**: Cron-Job kopiert SQLite-DB täglich nach `/var/backups/getraenke/`.

## Verzeichnisstruktur (Detail)

```
backend/
├── src/
│   ├── controllers/      # Request-Handler
│   ├── routes/           # Route-Definitionen pro Ressource
│   ├── middleware/       # auth, errorHandler, rateLimit
│   ├── services/         # Geschäftslogik (BookingService, ReportService)
│   ├── db/
│   │   ├── connection.ts
│   │   └── migrations/   # Versionierte SQL-Migrationen
│   ├── schemas/          # Zod-Schemas
│   ├── utils/
│   ├── app.ts            # Express-Setup
│   └── server.ts         # Entry-Point
├── tests/
│   ├── unit/
│   └── integration/
├── tsconfig.json
└── package.json

frontend/
├── src/
│   ├── components/       # Wiederverwendbare UI-Komponenten
│   ├── pages/            # Routen-Komponenten
│   ├── hooks/            # Custom Hooks
│   ├── api/              # API-Client (fetch-Wrapper)
│   ├── context/          # AuthContext
│   ├── App.tsx
│   └── main.tsx
├── tests/                # Vitest-Komponententests
├── e2e/                  # Playwright-Specs
├── tsconfig.json
└── vite.config.ts
```

## Build- und Run-Strategie

| Umgebung    | Backend                                          | Frontend                        |
| ----------- | ------------------------------------------------ | ------------------------------- |
| Development | `tsx watch src/server.ts` (kein Build-Step)      | `vite` Dev-Server mit HMR       |
| Production  | `tsc` → `dist/`, Start mit `node dist/server.js` | `vite build` → statische Assets |

Im Pi-Deployment liefert das Backend die `frontend/dist/`-Assets statisch aus, sodass nur ein Port exponiert werden muss (siehe Übersicht).
