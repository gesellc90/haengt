-- M10: Erweitertes Mitglieder-Profil — E-Mail-Adresse und Profilbild.
--
-- email: optional, case-insensitive eindeutig (wenn gesetzt).
--   Partieller Unique-Index statt UNIQUE-Constraint, weil SQLite NULL-Werte in
--   normalen UNIQUE-Indizes als verschieden behandelt – der partielle Index
--   (WHERE email IS NOT NULL) ist expliziter und dokumentierter.
--
-- avatar_path: relativer Dateiname des gespeicherten Profilbilds (z. B. "42.webp").
--   Der absolute Pfad ergibt sich aus der ENV-Variable AVATAR_DIR.
--   NULL = kein Bild hochgeladen.

ALTER TABLE members ADD COLUMN email       TEXT COLLATE NOCASE;
ALTER TABLE members ADD COLUMN avatar_path TEXT;

CREATE UNIQUE INDEX idx_members_email
  ON members (email)
  WHERE email IS NOT NULL;
