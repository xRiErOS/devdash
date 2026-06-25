-- Multi-Tenant: zentrale projects-Tabelle, project_id FK in Daten-Tabellen.
-- Bestehende Daten (Sprints, Backlog, Archon-Runs) werden auf project_id=1
-- (MyBaby Tracker) gebackfilled.

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  archived    INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO projects (id, slug, name, description, color)
VALUES (1, 'mybaby', 'MyBaby Tracker', 'Self-hosted Baby-Tracker (myPrivateBabyTracker)', '#cba6f7');

ALTER TABLE sprints     ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE backlog     ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE archon_runs ADD COLUMN project_id INTEGER REFERENCES projects(id);

UPDATE sprints     SET project_id = 1 WHERE project_id IS NULL;
UPDATE backlog     SET project_id = 1 WHERE project_id IS NULL;
UPDATE archon_runs SET project_id = 1 WHERE project_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sprints_project     ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_backlog_project     ON backlog(project_id);
CREATE INDEX IF NOT EXISTS idx_archon_runs_project ON archon_runs(project_id);
