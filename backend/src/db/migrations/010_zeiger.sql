-- M11: Zeiger (Couleurbesuch & Verbindungsveranstaltungen)
--
-- verbindungen: kuratierte Liste für die Schnellauswahl (Admin-pflegbar).
-- zeiger:       offene/geschlossene Abrechnungszettel für Anlässe.
-- bookings.zeiger_id (nullable): wenn gesetzt, läuft die Buchung auf den
--   Zeiger statt auf das Personenkonto. Personen-Saldo/Monats-Reports
--   filtern `WHERE zeiger_id IS NULL`.

CREATE TABLE verbindungen (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  zirkel     TEXT,           -- kurzes Kürzel, z. B. „Sax."
  ort        TEXT,           -- Hochschulort
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE zeiger (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  titel                TEXT    NOT NULL,
  art                  TEXT    NOT NULL CHECK (art IN ('veranstaltung', 'besuch')),
  -- NULL = Freitext-Veranstaltung, gesetzt = Couleurbesuch einer bekannten Verbindung
  verbindung_id        INTEGER REFERENCES verbindungen(id) ON DELETE SET NULL,
  created_by           INTEGER NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  anzahl_bundesbrueder INTEGER NOT NULL DEFAULT 0 CHECK (anzahl_bundesbrueder >= 0),
  anzahl_gaeste        INTEGER NOT NULL DEFAULT 0 CHECK (anzahl_gaeste >= 0),
  status               TEXT    NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'geschlossen')),
  opened_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at            TEXT,
  closed_by            INTEGER REFERENCES members(id) ON DELETE SET NULL
) STRICT;

CREATE INDEX idx_zeiger_status ON zeiger (status, opened_at DESC);

-- bookings.zeiger_id ist nullable: NULL = Selbstbuchung / Personenkonto.
-- ON DELETE RESTRICT: Zeiger mit Buchungen können nicht gelöscht werden.
ALTER TABLE bookings ADD COLUMN zeiger_id INTEGER REFERENCES zeiger(id) ON DELETE RESTRICT;
