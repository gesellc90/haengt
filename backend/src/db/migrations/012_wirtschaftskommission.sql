-- M13: Wirtschaftskommission (WK) & Konten-Streichung.
--
-- is_wirtschaftskommission: 1 = Konto gehört der Wirtschaftskommission und darf
--   Mitglieder-Konten streichen/entstreichen. Bewusst als Capability-Flag
--   modelliert (analog zu can_book_for_others), NICHT als neuer role-Wert:
--   die role-CHECK-Constraint (admin|member) via Table-Rebuild zu erweitern wäre
--   wegen der ON-DELETE-RESTRICT-Fremdschlüssel auf members (bookings.member_id,
--   zeiger.created_by) im laufenden Migrations-Runner nicht gefahrlos möglich.
--   Ein Admin darf ebenfalls streichen (siehe Service-/Middleware-Logik).
--
-- struck_until: ISO-8601-UTC-Zeitpunkt, bis zu dem das Konto gestrichen ist.
--   NULL           = nicht gestrichen.
--   > jetzt        = gestrichen: es können keine Getränke auf das Konto gebucht
--                    werden (Personenbuchungen; Zeiger-Buchungen laufen auf die
--                    Vereinskasse und bleiben erlaubt).
--   <= jetzt        = Streichung abgelaufen (automatisch wieder bebuchbar).
--   Die Streichung dauert regulär 2 Wochen; die WK kann vorzeitig entstreichen.

ALTER TABLE members
  ADD COLUMN is_wirtschaftskommission INTEGER NOT NULL DEFAULT 0
    CHECK (is_wirtschaftskommission IN (0, 1));

ALTER TABLE members
  ADD COLUMN struck_until TEXT;
