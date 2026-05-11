-- Getränkekatalog.
-- is_available: Soft-Delete – deaktivierte Getränke tauchen nicht mehr im Buchungsscreen auf.

CREATE TABLE drinks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  is_available INTEGER NOT NULL DEFAULT 1
               CHECK (is_available IN (0, 1)),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TRIGGER drinks_updated_at
  AFTER UPDATE ON drinks
  FOR EACH ROW
BEGIN
  UPDATE drinks SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;
