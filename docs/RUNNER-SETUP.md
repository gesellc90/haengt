# GitHub Actions Self-Hosted Runner — Installation auf dem Pi

Diese Anleitung registriert einen Self-Hosted Runner auf dem Vereins-Pi,
damit `.github/workflows/deploy.yml` (Pi-Deploy-Job) bei jedem `v*.*.*`-Tag
ausgeführt werden kann.

**Voraussetzungen:** Der Pi ist nach [`RASPBERRY-PI-SETUP.md`](./RASPBERRY-PI-SETUP.md)
eingerichtet. Insbesondere existiert der User `getraenke-runner` und kann
`curl` zu `https://api.github.com` machen (Outgoing-Firewall-Regel).

## Schritt 1 — Runner-Tarball herunterladen

Den passenden Runner-Tarball für ARM64-Linux ziehen. Version regelmäßig
aktualisieren — siehe https://github.com/actions/runner/releases.

```bash
sudo -u getraenke-runner -i        # Wechsel in den Runner-Home

mkdir -p ~/actions-runner && cd ~/actions-runner

# Aktuellste ARM64-Linux-Version (Stand Mai 2026 ≈ 2.327):
RUNNER_VERSION="2.327.1"
curl -fsSL -o runner.tar.gz \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz"

# Integritäts-Check: SHA-256 von der Release-Seite holen und vergleichen.
# (GitHub stellt das Hash-Snippet im Release-Body bereit — bitte
# vergleichen, bevor du extrahierst!)
sha256sum runner.tar.gz

tar -xzf runner.tar.gz
rm runner.tar.gz
```

## Schritt 2 — Registration-Token aus GitHub holen

1. Im Browser: `https://github.com/gesellc90/h-ngt/settings/actions/runners/new`
2. „Linux" + „ARM64" auswählen (wichtig für die Anleitung — die Pfade
   stimmen mit dem Tarball oben überein).
3. **Den Registration-Token aus dem `./config.sh --token <…>`-Befehl
   kopieren**. Der Token ist nur ~1 Stunde gültig.

## Schritt 3 — Runner konfigurieren

```bash
# Weiterhin als getraenke-runner in ~/actions-runner:
./config.sh \
  --url    https://github.com/gesellc90/h-ngt \
  --token  <TOKEN-AUS-SCHRITT-2> \
  --name   getraenke-pi \
  --labels self-hosted,raspberry-pi,arm64 \
  --runnergroup default \
  --work    _work \
  --unattended \
  --replace
```

> **Labels:** `self-hosted,raspberry-pi,arm64` ist Pflicht — die deploy.yml
> zielt mit `runs-on: [self-hosted, raspberry-pi]` darauf. Wenn die Labels
> abweichen, läuft der Pi-Job nie an.

## Schritt 4 — Als systemd-Service installieren

```bash
# Erfordert sudo — temporär aus dem Runner-Home raus oder neues Terminal als sudoer.
exit       # zurück zum pi-admin-User

cd /home/getraenke-runner/actions-runner
sudo ./svc.sh install getraenke-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

Service-Name: `actions.runner.gesellc90-h-ngt.getraenke-pi.service`.

Logs ansehen:

```bash
sudo journalctl -u 'actions.runner.gesellc90-h-ngt.getraenke-pi.service' -f
```

## Schritt 5 — Smoke-Test

In GitHub: `https://github.com/gesellc90/h-ngt/settings/actions/runners`.
Der Runner muss als **„Idle"** erscheinen.

Ein leerer Trigger-Test:

```bash
# Auf dem Entwicklungs-Rechner:
git tag v0.0.0-pi-smoke
git push origin v0.0.0-pi-smoke
```

→ Workflow `Deploy` wird ausgelöst, Build-Job läuft auf ubuntu-latest,
Deploy-Job verbindet sich mit dem Pi-Runner. Bei Fehlern: Workflow-Run in
GitHub öffnen, der Pi-Runner zeigt im „self-hosted"-Job die Schritte in
Echtzeit.

**Smoke-Tag wieder löschen, sobald der Run grün ist:**

```bash
git push --delete origin v0.0.0-pi-smoke
git tag -d v0.0.0-pi-smoke
```

## Updates

GitHub veröffentlicht regelmäßig neue Runner-Versionen — der bestehende
Runner aktualisiert sich automatisch, solange er online ist. Manueller
Restart bei Bedarf:

```bash
sudo ./svc.sh stop && sudo ./svc.sh start
```

## Deinstallation

Falls du den Runner abmelden willst (z. B. Pi-Wechsel):

```bash
# Token erneut von der GitHub-„Runner hinzufügen"-Seite holen, dann:
sudo /home/getraenke-runner/actions-runner/svc.sh stop
sudo /home/getraenke-runner/actions-runner/svc.sh uninstall
sudo -u getraenke-runner /home/getraenke-runner/actions-runner/config.sh remove --token <REMOVE-TOKEN>
```

## Sicherheitshinweise

- **Der Runner führt beliebigen Code aus, der in workflow-Files steht.**
  Halte das Repo daher zugriffsgeschützt — Fork-PRs sollten den Self-Hosted
  Runner nicht triggern. Standard-Verhalten in GitHub Settings → Actions
  → „Require approval for all outside collaborators" aktivieren.
- Der Runner läuft als `getraenke-runner`, nicht als root. Sudo-Rechte sind
  in `scripts/getraenke-deploy.sudoers` minimal gehalten (siehe
  [`DEPLOYMENT.md`](./DEPLOYMENT.md#runner-user-und-sudoers)).
- Der Pi muss outgoing HTTPS zu `api.github.com` und `*.actions.githubusercontent.com`
  erreichen können — ufw allow outgoing (Standard) reicht.
- Registration-Tokens niemals committen — sie sind nur einmalig und kurz
  gültig, aber dennoch Geheimnisse.
