# Contributing

Vielen Dank für dein Interesse, zum Projekt beizutragen! Dieses Dokument beschreibt den Entwicklungs-Workflow.

## Branch-Strategie (Trunk-Based, leichtgewichtig)

```
main         ←  immer deploy-bar, geschützt
 ├─ feature/<kurz-beschreibung>
 ├─ fix/<issue-id>-<kurz>
 ├─ chore/<thema>
 └─ docs/<thema>
```

- `main` ist der einzige langlebige Branch und ist auf GitHub geschützt (kein direkter Push, PR + Review erforderlich).
- Feature-Branches sind **kurzlebig** (idealerweise < 3 Tage). Lieber kleinere PRs.
- Vor dem PR den Branch mit `main` rebasen: `git rebase origin/main`.
- Nach dem Merge wird der Feature-Branch gelöscht (Squash-Merge bevorzugt).

### Branch-Namen

| Präfix     | Verwendung                          | Beispiel                          |
|------------|-------------------------------------|-----------------------------------|
| `feature/` | Neue Funktionalität                 | `feature/booking-void`            |
| `fix/`     | Bugfix                              | `fix/42-pdf-encoding`             |
| `chore/`   | Build, Tooling, Wartung             | `chore/upgrade-vite`              |
| `docs/`    | Reine Doku-Änderungen               | `docs/deployment-guide`           |
| `refactor/`| Refactoring ohne Verhaltensänderung | `refactor/extract-booking-svc`    |

## Commit-Konventionen

Wir folgen [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <kurze Beschreibung im Imperativ>

[optionaler Body mit Begründung / Kontext]

[optionaler Footer mit BREAKING CHANGE oder Issue-Referenz]
```

### Types

| Type       | Bedeutung                                        |
|------------|--------------------------------------------------|
| `feat`     | Neue Funktionalität (sichtbar für Nutzer)        |
| `fix`      | Bugfix                                           |
| `docs`     | Nur Dokumentation                                |
| `style`    | Formatierung, kein Codeverhalten                 |
| `refactor` | Code-Änderung ohne neuen Feature/Fix             |
| `test`     | Tests hinzufügen oder anpassen                   |
| `chore`    | Build-Prozess, Tooling, Dependencies             |
| `ci`       | CI-Konfiguration                                 |
| `perf`     | Performance-Verbesserung                         |

### Beispiele

```
feat(bookings): allow voiding own booking within 5 minutes

Fixes #42

---

fix(reports): use UTF-8 BOM in CSV export so Excel detects encoding

---

chore(deps): bump better-sqlite3 from 11.3.0 to 11.5.0
```

### Scope (optional, aber gerne nutzen)

`auth`, `bookings`, `drinks`, `members`, `reports`, `db`, `ui`, `ci`, `deps`, …

## Pull-Request-Prozess

1. **Issue zuerst** (für nicht-triviale Änderungen): Issue eröffnen, Vorgehen kurz abstimmen.
2. **Branch anlegen** ausgehend von aktuellem `main`.
3. **Klein halten**: < 400 Zeilen Diff sind ideal, > 800 fast immer ein Smell.
4. **Tests schreiben/anpassen**. Neue Logik ohne Test wird in der Regel nicht gemerged.
5. **`npm run lint && npm test` lokal grün** vor dem Push.
6. **PR öffnen** gegen `main`, Template ausfüllen:
   - Was? Warum? Wie getestet?
   - Screenshots bei UI-Änderungen
   - Verlinktes Issue (`Closes #...`)
7. **CI muss grün sein** — Reviewer warten erst gar nicht auf rote Pipelines.
8. **Mindestens 1 Review** ist erforderlich (bei Solo-Projekten: 24h-Self-Review-Pause).
9. **Squash-Merge** in `main`. Commit-Message folgt erneut Conventional Commits.

### PR-Checkliste (Vorlage)

```markdown
## Was
<kurze Beschreibung>

## Warum
<Kontext, Issue-Link>

## Wie getestet
- [ ] Unit-Tests grün
- [ ] Integrationstests grün
- [ ] Manuell getestet (Browser + Mobile-Viewport)
- [ ] CHANGELOG.md aktualisiert (bei nutzersichtbaren Änderungen)
- [ ] ARCHITECTURE.md aktualisiert (bei strukturellen Änderungen)
```

## Code-Stil

- **ESLint + Prettier** sind verbindlich. `npm run lint:fix` vor dem Commit.
- **Keine `any`-Types**, keine ungenutzten Imports.
- **Keine `console.log`** in committtetem Code — `pino`-Logger nutzen.
- **Async/Await** statt `.then()`-Ketten.
- **Funktionen klein halten** (< 40 Zeilen Faustregel).

## Tests

- Neue Features: **mindestens ein Unit-Test** für Geschäftslogik.
- Neue API-Endpunkte: **mindestens ein Supertest-Integrationstest**.
- Kritische User-Flows: **Playwright E2E-Test** (Login, Buchung, Abrechnung).

Details siehe [`docs/TESTING.md`](docs/TESTING.md).

## Issue-Labels

| Label              | Bedeutung                            |
|--------------------|--------------------------------------|
| `bug`              | Defekt im Verhalten                  |
| `enhancement`      | Erweiterung / neues Feature          |
| `good first issue` | Gut für Einsteiger                   |
| `needs-discussion` | Vor Implementierung Konzept klären   |
| `breaking`         | Erfordert Migration / Major-Bump     |

## Versionierung

Wir folgen [SemVer](https://semver.org/lang/de/) (`MAJOR.MINOR.PATCH`). Bei jedem Release:

1. `CHANGELOG.md` aktualisieren (`Unreleased` → `[x.y.z] - YYYY-MM-DD`)
2. `package.json`-Version anpassen
3. Git-Tag setzen: `git tag -a v1.2.0 -m "Release 1.2.0"`
4. Push: `git push origin main --tags`

## Fragen?

Bei Unklarheiten gerne ein Issue mit Label `question` öffnen.
