-- Vereinsmitglieder.
-- role: 'admin' darf alles, 'member' darf nur eigene Buchungen sehen und anlegen.
-- password_hash: bcrypt-Hash (wird ab M3 befüllt; bis dahin NULL erlaubt).
-- is_active: Soft-Delete-Flag – inaktive Mitglieder können sich nicht einloggen.

CREATE TABLE members (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT    NOT NULL,
  password_hash TEXT,
  role          TEXT    NOT NULL DEFAULT 'member'
                        CHECK (role IN ('admin', 'member')),
  is_active     INTEGER NOT NULL DEFAULT 1
                        CHECK (is_active IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Trigger hält updated_at aktuell
CREATE TRIGGER members_updated_at
  AFTER UPDATE ON members
  FOR EACH ROW
BEGIN
  UPDATE members SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;
