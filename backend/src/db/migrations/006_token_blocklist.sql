-- Blocklist für invalidierte JWTs (Logout).
-- Wir speichern die JTI (JWT ID, ein UUID) statt des vollständigen Tokens.
-- expires_at entspricht der Ablaufzeit des Tokens, damit wir abgelaufene
-- Einträge sauber bereinigen können, ohne echte Sicherheit zu opfern.

CREATE TABLE token_blocklist (
  jti        TEXT    NOT NULL PRIMARY KEY,
  expires_at TEXT    NOT NULL,  -- ISO-8601 UTC
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Index für die Cleanup-Abfrage (löscht Einträge nach Ablauf)
CREATE INDEX idx_token_blocklist_expires
  ON token_blocklist (expires_at);
