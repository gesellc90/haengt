-- M9: Mitglieder-Kategorien (Korporationsstatus) und Allgemein-Konto-Berechtigung.
--
-- member_status: Einteilung im Verbindungs-Sinn – UNABHÄNGIG von is_active.
--   is_active steuert Login/Soft-Delete, member_status nur die Kategorie.
--   So bleibt z. B. ein "Freund der Verbindung" ohne Login (password_hash NULL)
--   trotzdem ein aktives, bebuchbares Mitglied (is_active = 1).
--   Werte: 'aktiv' | 'inaktiv' | 'alter_herr' | 'freund'
--
-- can_book_for_others: 1 = Konto darf für beliebige andere Mitglieder buchen
--   (Theken-/Allgemein-Konto). Sonst gelten die normalen Member-Rechte.

ALTER TABLE members
  ADD COLUMN member_status TEXT NOT NULL DEFAULT 'aktiv'
    CHECK (member_status IN ('aktiv', 'inaktiv', 'alter_herr', 'freund'));

ALTER TABLE members
  ADD COLUMN can_book_for_others INTEGER NOT NULL DEFAULT 0
    CHECK (can_book_for_others IN (0, 1));
