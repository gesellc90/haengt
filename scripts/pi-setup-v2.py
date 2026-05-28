#!/usr/bin/env python3
"""
Hängt! – Raspberry Pi Setup v2 (korrigierte Version)
Verwendung: python3 pi-setup-v2.py

Was dieses Skript tut:
  1. Alten Fehl-Setup (/opt/haengt/) aufräumen
  2. Systembenutzer 'getraenke' (App) und 'getraenke-runner' (CI) anlegen
  3. Verzeichnisstruktur nach DEPLOYMENT.md anlegen
  4. getraenke.service aus scripts/ installieren
  5. sudoers-Snippet aus scripts/ installieren
  6. /etc/getraenke/env mit zufälligen Secrets anlegen
  7. nginx als Reverse Proxy konfigurieren
  8. GitHub Actions Runner herunterladen (Konfiguration erfolgt danach manuell)
"""

import sys, io, secrets, subprocess

try:
    import paramiko
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install",
                           "paramiko", "--quiet", "--break-system-packages"],
                          stderr=subprocess.DEVNULL)
    import paramiko

PI_HOST = "192.168.0.15"
PI_USER = "pi-admin"
PI_PASS = "Gene!sis1"

GREEN  = "\033[0;32m"
YELLOW = "\033[1;33m"
CYAN   = "\033[0;36m"
RED    = "\033[0;31m"
NC     = "\033[0m"

def log(msg):  print(f"{CYAN}[INFO]{NC}  {msg}")
def ok(msg):   print(f"{GREEN}[OK]{NC}    {msg}")
def warn(msg): print(f"{YELLOW}[WARN]{NC}  {msg}")
def fail(msg):
    print(f"{RED}[FAIL]{NC}  {msg}")
    sys.exit(1)

def connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(PI_HOST, username=PI_USER, password=PI_PASS, timeout=15)
    return c

def run(client, cmd, timeout=120):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc  = stdout.channel.recv_exit_status()
    return out, err, rc

def sudo(client, cmd, timeout=300):
    escaped = cmd.replace("\\", "\\\\").replace("'", "'\\''")
    full = f"echo '{PI_PASS}' | sudo -S bash -c '{escaped}'"
    _, stdout, _ = client.exec_command(full, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    rc  = stdout.channel.recv_exit_status()
    return out, "", rc

def put(client, content: str, remote_path: str):
    sftp = client.open_sftp()
    sftp.putfo(io.BytesIO(content.encode()), remote_path)
    sftp.close()

# ─────────────────────────────────────────────────────────────────────────────
log("Verbinde mit dem Pi...")
try:
    client = connect()
except Exception as e:
    fail(f"SSH-Verbindung fehlgeschlagen: {e}\n"
         f"Tipp: ssh-keygen -R {PI_HOST}  dann erneut versuchen.")
ok("Verbindung steht.")

out, _, _ = run(client, "uname -m && cat /etc/os-release | head -2")
print(f"  {out.strip()}\n")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 1: Alten Fehl-Setup aufräumen...")
sudo(client, "systemctl stop haengt.service 2>/dev/null || true && "
             "systemctl disable haengt.service 2>/dev/null || true && "
             "rm -f /etc/systemd/system/haengt.service && "
             "rm -f /etc/nginx/sites-enabled/haengt && "
             "rm -f /etc/nginx/sites-available/haengt && "
             "rm -rf /opt/haengt && "
             "systemctl daemon-reload && "
             "nginx -t && systemctl reload nginx 2>/dev/null || true")
ok("Alter Setup entfernt.")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 1b: Benötigte Pakete sicherstellen (inkl. sqlite3 für DB-Backups)...")
sudo(client,
     "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "
     "git curl build-essential ca-certificates gnupg nginx sqlite3",
     timeout=180)
ok("Pakete vorhanden.")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 2: Systembenutzer anlegen...")
# App-User: getraenke (kein Login, kein Home nötig — StateDirectory= in systemd)
sudo(client,
     "id getraenke &>/dev/null || "
     "useradd --system --no-create-home --shell /usr/sbin/nologin getraenke")
# Runner-User: getraenke-runner (kein interaktives Login, aber Home für Runner-Konfig)
sudo(client,
     "id getraenke-runner &>/dev/null || "
     "useradd --system --create-home --shell /usr/sbin/nologin getraenke-runner && "
     "usermod -aG getraenke getraenke-runner")
ok("Benutzer 'getraenke' und 'getraenke-runner' vorhanden.")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 3: Verzeichnisstruktur anlegen...")
sudo(client,
     # Releases + aktueller Symlink-Platzhalter
     "mkdir -p /opt/getraenke/releases && "
     "chown getraenke-runner:getraenke /opt/getraenke /opt/getraenke/releases && "
     "chmod 2775 /opt/getraenke /opt/getraenke/releases && "
     # Runner-Verzeichnis
     "mkdir -p /opt/getraenke/runner && "
     "chown getraenke-runner:getraenke-runner /opt/getraenke/runner && "
     # Backups
     "mkdir -p /var/backups/getraenke && "
     "chown getraenke-runner:getraenke /var/backups/getraenke && "
     "chmod 2775 /var/backups/getraenke && "
     # /etc/getraenke/ für EnvironmentFile
     "mkdir -p /etc/getraenke && "
     "chown root:getraenke /etc/getraenke && "
     "chmod 0750 /etc/getraenke")
ok("Verzeichnisstruktur angelegt.")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 4: getraenke.service installieren...")
# Service-Datei direkt aus dem Repo (scripts/getraenke.service) einlesen
import os
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
service_path = os.path.join(repo_root, "scripts", "getraenke.service")
try:
    with open(service_path) as f:
        service_content = f.read()
except FileNotFoundError:
    fail(f"scripts/getraenke.service nicht gefunden unter: {service_path}")

tmp = f"/home/{PI_USER}/getraenke.service.tmp"
put(client, service_content, tmp)
sudo(client,
     f"install -m 0644 -o root -g root {tmp} /etc/systemd/system/getraenke.service && "
     f"rm {tmp} && systemctl daemon-reload && systemctl enable getraenke.service")
ok("getraenke.service installiert und aktiviert.")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 5: sudoers-Snippet installieren...")
sudoers_path = os.path.join(repo_root, "scripts", "getraenke-deploy.sudoers")
try:
    with open(sudoers_path) as f:
        sudoers_content = f.read()
except FileNotFoundError:
    fail(f"scripts/getraenke-deploy.sudoers nicht gefunden unter: {sudoers_path}")

tmp = f"/home/{PI_USER}/getraenke-deploy.sudoers.tmp"
put(client, sudoers_content, tmp)
out, _, rc = sudo(client,
     f"install -m 0440 -o root -g root {tmp} /etc/sudoers.d/getraenke-deploy && "
     f"rm {tmp} && visudo -cf /etc/sudoers.d/getraenke-deploy")
if "parsed OK" not in out:
    warn(f"visudo-Ausgabe: {out.strip()}")
else:
    ok("sudoers-Snippet installiert (visudo: parsed OK).")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 6: /etc/getraenke/env anlegen...")
jwt_secret = secrets.token_hex(32)
session_secret = secrets.token_hex(32)
env_content = f"""# Produktions-Konfiguration für getraenke.service
# Eigentümer: root:getraenke  Mode: 0640
NODE_ENV=production
PORT=3001
DB_PATH=/var/lib/getraenke/getraenke.db
JWT_SECRET={jwt_secret}
JWT_EXPIRES_IN=8h
LOG_LEVEL=info
"""
tmp = f"/home/{PI_USER}/getraenke.env.tmp"
put(client, env_content, tmp)
out_check, _, _ = run(client, "test -f /etc/getraenke/env && echo EXISTS || echo MISSING")
if "EXISTS" in out_check:
    warn("/etc/getraenke/env existiert bereits — wird NICHT überschrieben.")
    warn("Prüfe die Werte manuell: sudo cat /etc/getraenke/env")
    sudo(client, f"rm {tmp}")
else:
    sudo(client,
         f"install -m 0640 -o root -g getraenke {tmp} /etc/getraenke/env && rm {tmp}")
    ok(f"/etc/getraenke/env angelegt (JWT_SECRET = {jwt_secret[:8]}…).")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 7: nginx als Reverse Proxy konfigurieren (Port 80 → 3001)...")
nginx_config = """server {
    listen 80;
    server_name _;

    location / {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
"""
tmp = f"/home/{PI_USER}/haengt.nginx.tmp"
put(client, nginx_config, tmp)
sudo(client,
     f"install -m 0644 -o root -g root {tmp} /etc/nginx/sites-available/getraenke && "
     f"rm {tmp} && "
     "ln -sf /etc/nginx/sites-available/getraenke /etc/nginx/sites-enabled/getraenke && "
     "rm -f /etc/nginx/sites-enabled/default && "
     "nginx -t && systemctl enable --now nginx")
ok("nginx konfiguriert: Port 80 → localhost:3001.")

# ─────────────────────────────────────────────────────────────────────────────
log("SCHRITT 8: GitHub Actions Runner herunterladen (nach /opt/getraenke/runner/)...")
out, _, _ = run(client, "ls /opt/getraenke/runner/config.sh 2>/dev/null && echo EXISTS || echo MISSING")
if "EXISTS" in out:
    ok("Runner-Binary bereits vorhanden — überspringe Download.")
else:
    out_arch, _, _ = run(client, "uname -m")
    arch = out_arch.strip()
    runner_arch = "arm64" if arch == "aarch64" else "arm"
    RUNNER_VERSION = "2.317.0"
    log(f"  Architektur: {arch} → linux-{runner_arch}")
    # Download nach /tmp (als pi-admin), dann als root nach /opt/getraenke/runner/ entpacken
    RUNNER_URL = (f"https://github.com/actions/runner/releases/download/"
                  f"v{RUNNER_VERSION}/actions-runner-linux-{runner_arch}-{RUNNER_VERSION}.tar.gz")
    out, err, rc = run(client,
        f"curl -fsSL -o /tmp/actions-runner.tar.gz '{RUNNER_URL}'",
        timeout=120)
    if rc != 0:
        fail(f"Download fehlgeschlagen:\n{out}\n{err}")
    out, err, rc = sudo(client,
        "tar xzf /tmp/actions-runner.tar.gz -C /opt/getraenke/runner && "
        "rm /tmp/actions-runner.tar.gz && "
        "chown -R getraenke-runner:getraenke-runner /opt/getraenke/runner",
        timeout=60)
    if rc != 0:
        fail(f"Entpacken fehlgeschlagen:\n{out}\n{err}")
    ok(f"Runner v{RUNNER_VERSION} heruntergeladen.")

# ─────────────────────────────────────────────────────────────────────────────
client.close()

print()
print(f"{GREEN}{'═'*65}{NC}")
print(f"{GREEN}  Pi-Setup v2 abgeschlossen!{NC}")
print(f"{GREEN}{'═'*65}{NC}")
print()
print(f"  {CYAN}Letzter manueller Schritt – Runner registrieren:{NC}")
print()
print(f"  1. Frisches Runner-Token holen (Tokens laufen nach 1h ab):")
print(f"     {YELLOW}github.com → gesellc90/h-ngt → Settings →{NC}")
print(f"     {YELLOW}Actions → Runners → New self-hosted runner → Linux{NC}")
print()
print(f"  2. SSH auf Pi, Runner als getraenke-runner konfigurieren:")
print(f"     {CYAN}ssh pi-admin@192.168.0.15{NC}")
print()
print(f"     sudo -u getraenke-runner /opt/getraenke/runner/config.sh \\")
print(f"       --url https://github.com/gesellc90/h-ngt \\")
print(f"       --token DEIN_FRISCHES_TOKEN \\")
print(f"       --name getraenke-pi \\")
print(f"       --labels raspberry-pi \\")
print(f"       --unattended")
print()
print(f"  3. Runner als systemd-Service starten:")
print(f"     cd /opt/getraenke/runner")
print(f"     sudo ./svc.sh install pi-admin")
print(f"     sudo ./svc.sh start")
print()
print(f"  4. Ersten Deploy auslösen (SemVer-Tag pushen):")
print(f"     git tag v0.1.0 && git push origin v0.1.0")
print()
print(f"  App läuft dann unter: {CYAN}http://192.168.0.15{NC}")
print()
