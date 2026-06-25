-- ProjectPages T-be1 (D-D, Modell B): session_notes — NEUE separate Rich-Entity für user-
-- verfasste Notizen (SessionNotesWidget, S2). NICHT Ersatz des SSTD-Auto-Journals: der bleibt
-- project_memories cat=session_note (PO-Entscheidung B 2026-06-23) → KEIN Daten-Move, KEIN
-- Journal-Rewiring, keine Breaking-Changes an MEMORY_CATEGORIES. Additiv (CREATE-only).
-- project-gescopt (FK project_id). 060/061 belegt → diese Migration = 062.

CREATE TABLE session_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  pr_url TEXT,
  sprints TEXT NOT NULL DEFAULT '[]',   -- JSON-Array von Sprint-Keys (z.B. ["DD#47"])
  issues TEXT NOT NULL DEFAULT '[]',    -- JSON-Array von Issue-Keys (z.B. ["DD-678","GF-433"])
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_session_notes_project ON session_notes(project_id);

-- FTS5 external-content über title+details (Pattern aus Migration 041). unicode61 =
-- diakritik-tolerante Tokenisierung. Suche speist die SessionNotesWidget-Suchleiste.
CREATE VIRTUAL TABLE session_notes_fts USING fts5(
  title,
  details,
  content='session_notes',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER session_notes_ai AFTER INSERT ON session_notes BEGIN
  INSERT INTO session_notes_fts(rowid, title, details) VALUES (new.id, new.title, new.details);
END;

CREATE TRIGGER session_notes_ad AFTER DELETE ON session_notes BEGIN
  INSERT INTO session_notes_fts(session_notes_fts, rowid, title, details)
  VALUES ('delete', old.id, old.title, old.details);
END;

CREATE TRIGGER session_notes_au AFTER UPDATE ON session_notes BEGIN
  INSERT INTO session_notes_fts(session_notes_fts, rowid, title, details)
  VALUES ('delete', old.id, old.title, old.details);
  INSERT INTO session_notes_fts(rowid, title, details) VALUES (new.id, new.title, new.details);
END;
