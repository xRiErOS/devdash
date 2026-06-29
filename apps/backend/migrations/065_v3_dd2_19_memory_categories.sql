-- DD2-19 (DD2#22): MEMORY_CATEGORIES erweitern + Begriffs-Abgrenzung.
--   (1) Neue Kategorie 'knowledge' (generisch) ergänzen.
--   (2) 'session_note' -> 'session_log' umbenennen (KI-Logbuch über zurückliegende
--       Sessions). Löst die Namenskollision mit der separaten user-Notizen-Tabelle
--       session_notes (wird in DD2-161 zu user_notes umbenannt).
--
-- SQLite kann CHECK-Constraints nicht ALTERn -> Tabellen-Recreate (Muster wie 038/029).
-- WICHTIG: Das neue Schema muss den VOLLEN aktuellen Spaltenstand spiegeln, nicht nur
-- 041 — Migration 042 ergänzte anchor + stability (+ idx_project_memories_anchor_active).
-- migrationRunner.js registriert 065 in FK_OFF_DURING_APPLY (foreign_keys=OFF während
-- Apply + foreign_key_check danach). Zusätzlich wird die self-referentielle FK
-- superseded_by beim Copy auf NULL gesetzt und per UPDATE restauriert, damit die
-- Migration auch unter FK=ON (raw createTestDb-Pfad der 999-Tests) ohne
-- Forward-Reference-Verletzung läuft.
--
-- Enum-Reihenfolge ist load-bearing für Fehlermeldungen (project-memory.contracts.js):
--   architecture_decision, dead_end, bug_pattern, convention, external_constraint,
--   session_log, knowledge

-- Trigger referenzieren die Tabelle -> vor dem Recreate droppen.
DROP TRIGGER IF EXISTS project_memories_ai;
DROP TRIGGER IF EXISTS project_memories_ad;
DROP TRIGGER IF EXISTS project_memories_au;

CREATE TABLE project_memories_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'architecture_decision','dead_end','bug_pattern','convention','external_constraint','session_log','knowledge'
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
  deleted_at TEXT,
  -- aus Migration 042:
  anchor TEXT,
  stability TEXT NOT NULL DEFAULT 'volatile' CHECK (stability IN ('stable', 'volatile'))
);

-- Daten kopieren; session_note -> session_log; superseded_by zunächst NULL.
INSERT INTO project_memories_new
  (id, project_id, category, summary, content, tags, importance, pinned,
   source_type, source_ref, superseded_by, created_at, updated_at, deleted_at,
   anchor, stability)
SELECT
  id, project_id,
  CASE category WHEN 'session_note' THEN 'session_log' ELSE category END,
  summary, content, tags, importance, pinned,
  source_type, source_ref, NULL, created_at, updated_at, deleted_at,
  anchor, stability
FROM project_memories;

-- superseded_by restaurieren (alle Ziele existieren jetzt im _new).
UPDATE project_memories_new
SET superseded_by = (
  SELECT pm.superseded_by FROM project_memories pm WHERE pm.id = project_memories_new.id
)
WHERE id IN (SELECT id FROM project_memories WHERE superseded_by IS NOT NULL);

DROP TABLE project_memories;
ALTER TABLE project_memories_new RENAME TO project_memories;

-- Indizes neu (wurden mit der alten Tabelle gedroppt) — inkl. 042 anchor-active.
CREATE INDEX idx_project_memories_project ON project_memories(project_id);
CREATE INDEX idx_project_memories_category ON project_memories(project_id, category);
CREATE INDEX idx_project_memories_active
  ON project_memories(project_id)
  WHERE deleted_at IS NULL AND superseded_by IS NULL;
CREATE UNIQUE INDEX idx_project_memories_anchor_active
  ON project_memories(project_id, anchor)
  WHERE anchor IS NOT NULL AND deleted_at IS NULL AND superseded_by IS NULL;

-- FTS-Sync-Trigger neu (external-content project_memories_fts überlebt den Recreate).
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

-- FTS-Index nach dem Tabellen-Recreate neu aufbauen (Konsistenz external-content).
INSERT INTO project_memories_fts(project_memories_fts) VALUES('rebuild');
