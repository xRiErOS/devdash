-- MEM-25: memory_tags — kuratiertes, projekt-scoped Stichwort-Register für project_memories.
-- Grill 2026-06-21 (PO Erik) D06/D07/D08: Controlled Vocabulary gegen Tag-Drift (Befund:
-- 509 distinct Tags / 73 % Singletons in Projekt 2). Tags an project_memories bleiben ein
-- Space-getrennter String; dieses Register ist die Whitelist, gegen die createMemory/
-- updateMemory hart validieren (server/lib/memoryTags.js validateTagsAgainstRegistry).
--
-- Enforcement ist self-activating (Grace-Period): solange ein Projekt KEINE Register-Tags
-- hat, greift KEINE Validierung — so bricht die Migration keine Live-Writes vor dem PO-
-- gegateten Seed (D11). Sobald ≥1 Tag registriert ist, gilt Hard-Block (D07).
--
-- FTS5 trigram über tag = Fuzzy-„Meintest du …"-Suggest beim Block (D07). Migration-Nummer
-- 057 (vorgängig: 056_v3_sprint_dependencies.sql).

CREATE TABLE memory_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, tag)
);

CREATE INDEX idx_memory_tags_project ON memory_tags(project_id);

-- FTS5 trigram-external-content über tag: Substring-/Fuzzy-Match für die Top-3-Suggest.
-- trigram (SQLite ≥3.34, in better-sqlite3 gebundelt) ist case-insensitiv per Default →
-- findet 'gf-2' als Suggest für ein abgelehntes 'GF-2'.
CREATE VIRTUAL TABLE memory_tags_fts USING fts5(
  tag,
  content='memory_tags',
  content_rowid='id',
  tokenize='trigram'
);

CREATE TRIGGER memory_tags_ai AFTER INSERT ON memory_tags BEGIN
  INSERT INTO memory_tags_fts(rowid, tag) VALUES (new.id, new.tag);
END;

CREATE TRIGGER memory_tags_ad AFTER DELETE ON memory_tags BEGIN
  INSERT INTO memory_tags_fts(memory_tags_fts, rowid, tag) VALUES ('delete', old.id, old.tag);
END;

CREATE TRIGGER memory_tags_au AFTER UPDATE ON memory_tags BEGIN
  INSERT INTO memory_tags_fts(memory_tags_fts, rowid, tag) VALUES ('delete', old.id, old.tag);
  INSERT INTO memory_tags_fts(rowid, tag) VALUES (new.id, new.tag);
END;
