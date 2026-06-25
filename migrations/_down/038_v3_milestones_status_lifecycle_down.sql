-- DD-306 (M3-S01 T08) Down-Migration: zurück zu altem Schema status TEXT DEFAULT 'open'.
-- Reverse-Backfill: planning→open, active→open, completed→reached, cancelled→cancelled.
-- 'active' wird zu 'open' weil altes Schema keine 'active'-Phase kannte.

CREATE TABLE milestones_old (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  position INTEGER,
  deferred INTEGER NOT NULL DEFAULT 0 CHECK(deferred IN (0, 1)),
  UNIQUE(project_id, name)
);

INSERT INTO milestones_old (id, project_id, name, description, target_date, status, created_at, position, deferred)
SELECT
  id, project_id, name, description, target_date,
  CASE status
    WHEN 'planning' THEN 'open'
    WHEN 'active' THEN 'open'
    WHEN 'completed' THEN 'reached'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'open'
  END,
  created_at, position, deferred
FROM milestones;

DROP INDEX IF EXISTS idx_milestones_status;
DROP TABLE milestones;
ALTER TABLE milestones_old RENAME TO milestones;

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_position ON milestones(project_id, position);
CREATE INDEX IF NOT EXISTS idx_milestones_deferred ON milestones(project_id, deferred);
