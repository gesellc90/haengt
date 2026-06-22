-- M9: Buchen für andere (Theken-/Allgemein-Konto).
--
-- booked_by_id hält fest, WER die Buchung ausgelöst hat.
--   NULL          = Selbstbuchung (member_id hat für sich selbst gebucht).
--   member-id ≠ member_id = Fremdbuchung durch ein Konto mit can_book_for_others
--                           (z. B. das Allgemein-Konto am Tresen).
--   member_id bleibt das ZIEL der Buchung ("auf wen wurde gebucht").
--
-- Nullable + ON DELETE SET NULL: Bestehende Buchungen sind Selbstbuchungen,
--   und ein gelöschter Buchender soll die Ziel-Buchung nicht blockieren.

ALTER TABLE bookings
  ADD COLUMN booked_by_id INTEGER REFERENCES members(id) ON DELETE SET NULL;
