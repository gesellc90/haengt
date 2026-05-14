# Testing

Dieses Projekt hat drei Test-Schichten, die alle in CI automatisch laufen:

| Schicht                 | Tool                     | Wo                | Was wird getestet                             |
| ----------------------- | ------------------------ | ----------------- | --------------------------------------------- |
| Unit / Integration (BE) | Vitest + Supertest       | `backend/tests/`  | Repos, Services, API-Endpoints                |
| Unit (FE)               | Vitest + Testing Library | `frontend/tests/` | React-Komponenten, Hooks                      |
| End-to-End (System)     | Playwright (Chromium)    | `e2e/tests/`      | Klick-Pfade gegen gebautes Backend + Frontend |

Lokale Befehle:

```bash
npm run test                # Backend + Frontend Unit-Tests
npm run test:e2e            # Playwright (komplette Suite, Headless)
npm run lint                # ESLint (root)
```

## Playwright-E2E lokal

Die E2E-Suite läuft gegen ein **frisch gebautes** Backend (`node dist/server.js`)
und einen **`vite preview`**-Server — produktionsnaher als das Dev-Setup.

### Erstmaliges Setup

```bash
# Aus dem Repo-Root:
npm ci
npm run build --workspace=backend
npm run build --workspace=frontend

# Chromium-Browser für Playwright installieren (einmalig, ca. 150 MB):
npx playwright install --with-deps chromium --workspace=e2e
```

### Tests ausführen

```bash
npm run test:e2e                       # alle Tests, Headless
npm run test:e2e -- tests/01-login.spec.ts   # einzelne Spec
npm run test:e2e -- --grep "Storno"          # Tests nach Name filtern
```

### Interaktiv debuggen

```bash
# UI-Modus: live-Watch, Time-Travel, Selektor-Picker
npm run test:e2e:ui --workspace=e2e

# Debug-Modus: stoppt vor jedem Schritt, Inspector öffnet sich
npm run test:e2e:debug --workspace=e2e
```

### Trace-Viewer (Post-Mortem)

Nach einem fehlgeschlagenen Test liegt unter `e2e/test-results/<spec>/trace.zip`
ein vollständiges Trace mit DOM-Snapshots, Konsole und Network-Log:

```bash
npx playwright show-trace e2e/test-results/<…>/trace.zip
```

Im CI werden Traces und Screenshots als Artefakt `playwright-results-<run-id>`
hochgeladen — Run öffnen → "Artifacts" → herunterladen → `show-trace` darauf.

## Test-Architektur

### Test-Datenbank

`e2e/global-setup.ts` legt für jeden Test-Run eine **frische SQLite-Datei** unter
`/tmp/getraenke-e2e-<random>/getraenke.db` an. Vorteile:

- Backend läuft als externer Prozess (wie in Produktion) und teilt sich die DB
  nicht mit dem Test-Code.
- `globalTeardown` löscht das tmpDir → keine Cross-Run-Verschmutzung.
- Migrationen laufen beim Backend-Boot automatisch.

### Seed-Daten

Zwei Stufen:

1. **Backend-Seed** (`backend/dist/db/seed.js`) — anlegen von Members
   `admin`, `anna`, `bernd`, vier Drinks (`Wasser`, `Cola`, `Bier`, `Spezi`)
   plus initiale Preise.
2. **Test-Seed** (`e2e/seed/test-seed.mjs`) — setzt bcrypt-Hashes für die
   Test-Passwörter und legt eine „alte" Buchung (anna, Bier, vor 10 Min) an,
   damit der negativ-Pfad in `03-void.spec.ts` einen Eintrag außerhalb des
   5-Minuten-Storno-Fensters vorfindet.

Test-Passwörter (deklariert in `e2e/seed/test-seed.mjs`, **nicht für Produktion**):

| Username | Passwort         | Rolle  |
| -------- | ---------------- | ------ |
| admin    | `admin-passwort` | admin  |
| anna     | `anna-passwort`  | member |
| bernd    | `bernd-passwort` | member |

### Ports

| Service        | Port | Konfigurierbar via  |
| -------------- | ---- | ------------------- |
| Backend (Test) | 3101 | `E2E_BACKEND_PORT`  |
| Vite preview   | 4173 | `E2E_FRONTEND_PORT` |

Beide Ports sind bewusst nicht die Dev-Defaults (3001 / 5173), damit eine
parallel laufende `npm run dev`-Instanz nicht kollidiert.

## Eine neue E2E-Spec schreiben

1. Datei `e2e/tests/<NN>-<thema>.spec.ts` anlegen.
2. Bevorzugt `getByRole`/`getByLabel` statt CSS-Selektoren — robust gegen
   Tailwind-Refactorings.
3. Wo möglich, Setup-Schritte über die API durchführen (siehe `helpers.ts`
   und `apiRequest.newContext`) — nur die zu testende Interaktion über
   die UI.
4. Lokal mit `--ui` durchklicken, bis der Flow stabil ist.

## CI

Drei separate Workflows, alle auf `push` + `pull_request`:

| Workflow     | Was                                                 |
| ------------ | --------------------------------------------------- |
| `ci.yml`     | Lint → TypeCheck → Unit/Integration → Build         |
| `e2e.yml`    | Playwright (Chromium, Pixel 5) gegen gebauten Stand |
| `deploy.yml` | nur auf `v*.*.*`-Tag: Build → Pi-Deploy (PR 2)      |

E2E ist absichtlich **nicht** in `ci.yml` integriert: läuft länger (Build +
Browser-Install), und ein UI-Drift soll die schnelle Unit-Test-Spur nicht
visuell rot färben.
