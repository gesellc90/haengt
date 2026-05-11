-- Preisverlauf pro Getränk.
-- Jede Preisänderung wird als neuer Eintrag gespeichert (append-only).
-- Der aktuell gültige Preis ist der Eintrag mit dem höchsten valid_from, der ≤ NOW ist.
-- price_cents: Preis in Cent (kein REAL, um Rundungsfehler zu vermeiden).

CREATE TABLE drink_prices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  drink_id    INTEGER NOT NULL REFERENCES drinks(id) ON DELETE RESTRICT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  valid_from  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_drink_prices_drink_valid
  ON drink_prices (drink_id, valid_from DESC);
