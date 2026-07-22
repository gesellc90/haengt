-- M12: Getränke-Kategorien.
--
-- drink_categories: admin-gepflegte Kategorien, nach denen Getränke gruppiert und
--   angezeigt werden. `sort_order` bestimmt die vom Admin festgelegte Reihenfolge
--   (aufsteigend, kleinster Wert zuerst); bei Gleichstand entscheidet der Name.
--
-- drinks.category_id: Pflichtzuordnung (auf App-Ebene erzwungen). Die DB-Spalte
--   bleibt technisch nullable, weil SQLite bei `ALTER TABLE … ADD COLUMN` keine
--   Kombination aus NOT NULL und REFERENCES zulässt. Der Bestand wird in dieser
--   Migration sofort der Standardkategorie „Sonstige" zugeordnet und neue Getränke
--   bekommen über den DrinksService immer eine Kategorie – in der Praxis existiert
--   also nie ein NULL-Wert.
--
-- ON DELETE RESTRICT: Kategorien mit zugeordneten Getränken lassen sich nicht
--   löschen (das Löschen wird zusätzlich im Service abgefangen und als Konflikt
--   gemeldet).

CREATE TABLE drink_categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TRIGGER drink_categories_updated_at
  AFTER UPDATE ON drink_categories
  FOR EACH ROW
BEGIN
  UPDATE drink_categories SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;

-- Standardkategorie für die Bestandsdaten-Migration.
INSERT INTO drink_categories (name, sort_order) VALUES ('Sonstige', 0);

ALTER TABLE drinks
  ADD COLUMN category_id INTEGER REFERENCES drink_categories(id) ON DELETE RESTRICT;

-- Bestehende Getränke der Standardkategorie zuordnen.
UPDATE drinks
  SET category_id = (SELECT id FROM drink_categories WHERE name = 'Sonstige');

CREATE INDEX idx_drinks_category ON drinks (category_id);
