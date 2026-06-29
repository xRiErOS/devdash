-- DD2-155 Down-Migration: zurück zum alten Status-Vokabular.
-- Reverse-Backfill (best-effort; `planned` und der Dup `closed` haben keine
-- exakte Umkehr und werden auf den nächstliegenden Alt-Status abgebildet):
--   Milestone:  new→planning, planned→planning, in_progress→active
--   Sprint:     new→planning, planned→planning, in_progress→active, to_review→review
--   Issue:      completed→done
-- Trigger werden entfernt, milestones erhält wieder den alten CHECK.

DROP TRIGGER IF EXISTS trg_backlog_status_update;
DROP TRIGGER IF EXISTS trg_backlog_status_insert;
DROP TRIGGER IF EXISTS trg_sprints_status_update;
DROP TRIGGER IF EXISTS trg_sprints_status_insert;

-- Issue: completed → done
UPDATE backlog SET status = 'done' WHERE status = 'completed';

-- Sprint: zurück (closed nicht wiederherstellbar — completed bleibt completed)
UPDATE sprints SET status = 'planning' WHERE status IN ('new', 'planned');
UPDATE sprints SET status = 'active'   WHERE status = 'in_progress';
UPDATE sprints SET status = 'review'   WHERE status = 'to_review';

-- Milestone: Table-Recreate mit altem CHECK (planning|active|completed|cancelled).
CREATE TABLE milestones_old (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'completed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  position INTEGER,
  deferred INTEGER NOT NULL DEFAULT 0 CHECK(deferred IN (0, 1)),
  spec_path TEXT,
  UNIQUE(project_id, name)
);

INSERT INTO milestones_old (id, project_id, name, description, target_date, status, created_at, position, deferred, spec_path)
SELECT
  id, project_id, name, description, target_date,
  CASE status
    WHEN 'new'         THEN 'planning'
    WHEN 'planned'     THEN 'planning'
    WHEN 'in_progress' THEN 'active'
    WHEN 'completed'   THEN 'completed'
    WHEN 'cancelled'   THEN 'cancelled'
    ELSE 'planning'
  END,
  created_at, position, deferred, spec_path
FROM milestones;

DROP INDEX IF EXISTS idx_milestones_status;
DROP INDEX IF EXISTS idx_milestones_spec_path;
DROP TABLE milestones;
ALTER TABLE milestones_old RENAME TO milestones;

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_position ON milestones(project_id, position);
CREATE INDEX IF NOT EXISTS idx_milestones_deferred ON milestones(project_id, deferred);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(project_id, status) WHERE status IN ('active', 'planning');
CREATE INDEX IF NOT EXISTS idx_milestones_spec_path ON milestones(project_id) WHERE spec_path IS NOT NULL;
