-- Audit-Log für sicherheitsrelevante Ereignisse.
-- event_type: z. B. 'login_success', 'login_failure', 'member_created', 'booking_voided' …
-- actor_id: Mitglied das die Aktion ausgelöst hat (NULL bei anonymen Anfragen).
-- target_type / target_id: Betroffene Ressource (optional).
-- meta: JSON-Blob mit kontextspezifischen Zusatzinfos (IP, User-Agent, …).

CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type  TEXT    NOT NULL,
  actor_id    INTEGER REFERENCES members(id) ON DELETE SET NULL,
  target_type TEXT,
  target_id   INTEGER,
  meta        TEXT,   -- JSON
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX idx_audit_log_event_type
  ON audit_log (event_type, created_at DESC);

CREATE INDEX idx_audit_log_actor
  ON audit_log (actor_id, created_at DESC);
