-- Buchungen (jedes "Strich zählt!").
-- price_cents_snapshot: Preis zum Zeitpunkt der Buchung – unveränderlich.
--   Ermöglicht korrekte Abrechnung auch wenn der Preis später geändert wird.
-- voided_at: gesetzt wenn storniert; NULL = aktive Buchung.
-- void_reason: optionale Notiz zum Stornogrund (z. B. "Versehen").

CREATE TABLE bookings (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id           INTEGER NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  drink_id            INTEGER NOT NULL REFERENCES drinks(id)  ON DELETE RESTRICT,
  price_cents_snapshot INTEGER NOT NULL CHECK (price_cents_snapshot >= 0),
  booked_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  voided_at           TEXT,
  void_reason         TEXT
) STRICT;

CREATE INDEX idx_bookings_member_booked
  ON bookings (member_id, booked_at DESC);

CREATE INDEX idx_bookings_booked_at
  ON bookings (booked_at DESC);
