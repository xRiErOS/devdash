-- DD2-161 (DD2#22): session_notes -> user_notes umbenennen.
-- Löst die Namenskollision mit der Memory-Kategorie session_log (vormals session_note,
-- DD2-19). user_notes = menschengeschriebene Rich-Notes (SessionNotesWidget). Das
-- KI-Auto-Logbuch bleibt project_memories cat=session_log und wird hier NICHT angefasst.
--
-- Migration 062 schuf session_notes + session_notes_fts (external-content) + 3 Trigger.
-- Die Tabelle ist leer (nie befüllt) -> kein Daten-Move. Wegen der external-content-FTS
-- (content='session_notes' hart verdrahtet) + Trigger ist DROP+CREATE sauberer als ein
-- ALTER TABLE RENAME (das FTS-Config + Trigger-Bodies nicht mitzieht).

DROP TRIGGER IF EXISTS session_notes_ai;
DROP TRIGGER IF EXISTS session_notes_ad;
DROP TRIGGER IF EXISTS session_notes_au;
DROP TABLE IF EXISTS session_notes_fts;
DROP TABLE IF EXISTS session_notes;

CREATE TABLE user_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  pr_url TEXT,
  sprints TEXT NOT NULL DEFAULT '[]',   -- JSON-Array von Sprint-Keys (z.B. ["DD2#22"])
  issues TEXT NOT NULL DEFAULT '[]',    -- JSON-Array von Issue-Keys (z.B. ["DD2-161"])
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_notes_project ON user_notes(project_id);

-- FTS5 external-content über title+details (Pattern aus 041/062). unicode61 =
-- diakritik-tolerante Tokenisierung. Speist die UserNotesWidget-Suchleiste.
CREATE VIRTUAL TABLE user_notes_fts USING fts5(
  title,
  details,
  content='user_notes',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER user_notes_ai AFTER INSERT ON user_notes BEGIN
  INSERT INTO user_notes_fts(rowid, title, details) VALUES (new.id, new.title, new.details);
END;

CREATE TRIGGER user_notes_ad AFTER DELETE ON user_notes BEGIN
  INSERT INTO user_notes_fts(user_notes_fts, rowid, title, details)
  VALUES ('delete', old.id, old.title, old.details);
END;

CREATE TRIGGER user_notes_au AFTER UPDATE ON user_notes BEGIN
  INSERT INTO user_notes_fts(user_notes_fts, rowid, title, details)
  VALUES ('delete', old.id, old.title, old.details);
  INSERT INTO user_notes_fts(rowid, title, details) VALUES (new.id, new.title, new.details);
END;
