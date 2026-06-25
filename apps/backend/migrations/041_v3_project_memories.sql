-- MEM-9 (MEM#5): project_memories — projektgebundenes Memory als Master für Projektwissen.
-- Entkoppelt vom globalen ~/.claude/memory.db (server/lib/memoryDb.js, NAS-deaktiviert).
-- FTS5-first (NAS-tauglich, kein Ollama/sqlite-vec). Vektor/Embeddings = Phase 2 (D05).
-- Append-only: Korrektur via superseded_by, kein stilles Überschreiben. Soft-Delete via deleted_at.
-- Migration-Nummer 041 (vorgängig: 040_v3_component_notes.sql). SSTD MEM §4 D05.

CREATE TABLE project_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'architecture_decision','dead_end','bug_pattern','convention','external_constraint','session_note'
  )),
  summary TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  importance INTEGER NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 3),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  source_type TEXT,
  source_ref TEXT,
  superseded_by INTEGER REFERENCES project_memories(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX idx_project_memories_project ON project_memories(project_id);
CREATE INDEX idx_project_memories_category ON project_memories(project_id, category);
CREATE INDEX idx_project_memories_active
  ON project_memories(project_id)
  WHERE deleted_at IS NULL AND superseded_by IS NULL;

-- FTS5 external-content index über summary/content/tags. Erste FTS5-Tabelle im Repo;
-- better-sqlite3 bundlet SQLite mit FTS5. unicode61 = diakritik-tolerante Tokenisierung.
CREATE VIRTUAL TABLE project_memories_fts USING fts5(
  summary,
  content,
  tags,
  content='project_memories',
  content_rowid='id',
  tokenize='unicode61'
);

-- Sync-Trigger (external-content-Pattern, SQLite-FTS5-Doku 4.4.3).
CREATE TRIGGER project_memories_ai AFTER INSERT ON project_memories BEGIN
  INSERT INTO project_memories_fts(rowid, summary, content, tags)
  VALUES (new.id, new.summary, new.content, new.tags);
END;

CREATE TRIGGER project_memories_ad AFTER DELETE ON project_memories BEGIN
  INSERT INTO project_memories_fts(project_memories_fts, rowid, summary, content, tags)
  VALUES ('delete', old.id, old.summary, old.content, old.tags);
END;

CREATE TRIGGER project_memories_au AFTER UPDATE ON project_memories BEGIN
  INSERT INTO project_memories_fts(project_memories_fts, rowid, summary, content, tags)
  VALUES ('delete', old.id, old.summary, old.content, old.tags);
  INSERT INTO project_memories_fts(rowid, summary, content, tags)
  VALUES (new.id, new.summary, new.content, new.tags);
END;
