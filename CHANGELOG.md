# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und das Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Added

- Initiale Projektstruktur (Backend, Frontend, Doku, CI)
- Architekturdokumentation (`ARCHITECTURE.md`)
- Contribution Guide (`CONTRIBUTING.md`)
- Meilensteinplan (`docs/MILESTONES.md`)
- **M7 Hälfte B (in Arbeit)**
  - systemd-Service-Unit `scripts/getraenke.service` mit gehärtetem Sandbox-Profil (NoNewPrivileges, ProtectSystem=strict, ProtectHome, PrivateTmp, PrivateDevices, RestrictAddressFamilies, SystemCallFilter, leeres CapabilityBoundingSet, MemoryMax=512M, StateDirectory=getraenke)
  - Deployment-Doku `docs/DEPLOYMENT.md` mit Verzeichnis-Layout, EnvironmentFile-Beispiel, Service-Account und Verifikations-Befehlen (`systemd-analyze verify`/`security`)
  - GitHub Actions Workflow `.github/workflows/deploy.yml` (Trigger auf SemVer-Tag `v*.*.*`): Build auf `ubuntu-latest`, Deploy auf `[self-hosted, raspberry-pi]` mit DB-Backup → Migration → atomarem Symlink-Swap (`ln -sfn` + `mv -Tf`) → Restart → Smoke-Test gegen `/api/v1/health`. Automatischer Rollback bei Fehlern nach Swap, Aufbewahrung der letzten 5 Releases
  - sudoers-Snippet `scripts/getraenke-deploy.sudoers` (minimaler NOPASSWD-Eintrag für `systemctl restart/status/is-active` + Migration als App-User)
  - Wrapper-Skript `scripts/deploy-migrate.sh` für DB-Migrationen während des Deploys (lädt `/etc/getraenke/env`, ruft `migrate-cli.js` als App-User `getraenke` auf)
  - CI-Erweiterung in `.github/workflows/ci.yml`: neuer Job `lint-deploy` mit `systemd-analyze verify`, `visudo -cf` und `bash -n` für alle Skripte
- **M1 — Projekt-Setup & Tooling**
  - Mono-Repo mit npm-Workspaces (`backend/`, `frontend/`)
  - Backend-Skeleton: Express, pino, Zod, `/api/v1/health`-Route, graceful Shutdown auf SIGTERM/SIGINT
  - Frontend-Skeleton: React 18 + Vite + TailwindCSS v3 + React Router, Dev-Proxy `/api → :3001`
  - TypeScript 5 überall mit `strict: true` und `noUncheckedIndexedAccess`
  - Smoke-Tests: Vitest + Supertest (Backend), Vitest + Testing-Library (Frontend)
  - ESLint Flat-Config (zentral im Root) + Prettier + Husky pre-commit + lint-staged
  - `npm run dev` startet Backend und Frontend parallel via `concurrently`
  - `.gitignore`, `.editorconfig`, `.nvmrc` (Node 20)
- **M3 — Authentifizierung & Sicherheit**
  - `bcryptjs`-Passwort-Hashing (Cost 10) mit Timing-Safe-Dummy-Vergleich bei unbekannten Usern
  - `AuthService`: Login, JWT-Issuance (HS256, 8h, JTI via `crypto.randomUUID`)
  - `POST /api/v1/auth/login` mit Zod-Validierung, Rate-Limit (5 Versuche / 15 Min / IP)
  - `GET /api/v1/auth/me` — gibt eigene Daten zurück (geschützt)
  - `POST /api/v1/auth/logout` — invalidiert Token via JTI-Blocklist in SQLite (geschützt)
  - `authenticate`-Middleware (Bearer-Token) + `requireRole`-Middleware
  - Migration 006: `token_blocklist`-Tabelle mit automatischem Cleanup abgelaufener Einträge
  - `AuditLogRepo` + `TokenBlocklistRepo`
  - Audit-Log-Einträge für Login-Erfolg und -Fehlschlag (mit IP und User-Agent)
  - `JWT_SECRET` in `env.ts` als required (min. 32 Zeichen)
  - Migrationen werden beim Serverstart automatisch ausgeführt

### Changed

- `ARCHITECTURE.md`: Verzeichnisstruktur auf TypeScript (`.ts`/`.tsx`) umgestellt, Build- und Run-Strategie-Tabelle ergänzt (Dev: `tsx watch` / `vite`, Prod: `tsc → dist/` / `vite build`)

### Deprecated

- _Noch nichts deprecatet_

### Removed

- _Noch nichts entfernt_

### Fixed

- _Noch keine Fixes_

### Security

- _Keine sicherheitsrelevanten Änderungen bisher_

---

## [0.1.0] - TBD

Erste interne Alpha-Version. Siehe `docs/MILESTONES.md` für den geplanten Inhalt von M1–M3.

<!--
Vorlage für neue Releases:

## [x.y.z] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...
-->

[Unreleased]: https://github.com/gesellc90/h-ngt/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/gesellc90/h-ngt/releases/tag/v0.1.0
