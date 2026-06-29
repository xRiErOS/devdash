-- DD2-155 (Status-Vereinheitlichung): gleiche Bedeutung = gleiches Wort über
-- Meilenstein/Sprint/Issue.
--   Milestone/Sprint:  planning → new,  active → in_progress
--   Sprint:            review   → to_review,  closed → completed (Dup-Kollaps)
--   Issue (backlog):   done     → completed
-- Milestone/Sprint gewinnen den Zustand `planned` (eingeplant). `closed` entfällt.
--
-- Integrität (D04): Milestone hatte bereits einen CHECK (Migration 038) → der
-- muss eh aktualisiert werden → Table-Recreate mit neuem CHECK. Sprint+backlog
-- hatten NIE einen CHECK; ein Table-Recreate dieser breiten Tabellen (60+
-- Migrationen) wäre riskant → stattdessen BEFORE INSERT/UPDATE-Trigger, die
-- ungültige Status-Werte hart mit RAISE(ABORT) ablehnen (gleiche Garantie).
--
-- migrationRunner.js setzt PRAGMA foreign_keys=OFF während dieser Migration
-- (registriert in FK_OFF_DURING_APPLY, analog 038/029) und prüft danach
-- foreign_key_check — nötig wegen des milestones-Recreate (sprints.milestone_id FK).
--
-- Aktuelles milestones-Schema (nach 038 + 039): id, project_id (FK projects),
-- name, description, target_date DATE NOT NULL, status TEXT CHECK(...),
-- created_at, position, deferred CHECK(0,1), spec_path TEXT, UNIQUE(project_id,name).

-- 1) Milestones: Table-Recreate mit neuem CHECK + Status-Backfill.
CREATE TABLE milestones_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'planned', 'in_progress', 'completed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  position INTEGER,
  deferred INTEGER NOT NULL DEFAULT 0 CHECK(deferred IN (0, 1)),
  spec_path TEXT,
  UNIQUE(project_id, name)
);

INSERT INTO milestones_new (id, project_id, name, description, target_date, status, created_at, position, deferred, spec_path)
SELECT
  id, project_id, name, description, target_date,
  CASE status
    WHEN 'planning'  THEN 'new'
    WHEN 'active'    THEN 'in_progress'
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'new'
  END,
  created_at, position, deferred, spec_path
FROM milestones;

DROP TABLE milestones;
ALTER TABLE milestones_new RENAME TO milestones;

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_position ON milestones(project_id, position);
CREATE INDEX IF NOT EXISTS idx_milestones_deferred ON milestones(project_id, deferred);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(project_id, status) WHERE status IN ('new', 'planned', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_milestones_spec_path ON milestones(project_id) WHERE spec_path IS NOT NULL;

-- 2) Sprints: Status-Backfill (vor Trigger-Anlage, damit Backfill selbst nicht abprallt).
UPDATE sprints SET status = 'new'         WHERE status = 'planning';
UPDATE sprints SET status = 'in_progress' WHERE status = 'active';
UPDATE sprints SET status = 'to_review'   WHERE status = 'review';
UPDATE sprints SET status = 'completed'   WHERE status = 'closed';

CREATE TRIGGER trg_sprints_status_insert
BEFORE INSERT ON sprints
FOR EACH ROW WHEN NEW.status IS NOT NULL
  AND NEW.status NOT IN ('new', 'planned', 'in_progress', 'to_review', 'completed', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'invalid sprint status (DD2-155: new|planned|in_progress|to_review|completed|cancelled)');
END;

CREATE TRIGGER trg_sprints_status_update
BEFORE UPDATE OF status ON sprints
FOR EACH ROW WHEN NEW.status IS NOT NULL
  AND NEW.status NOT IN ('new', 'planned', 'in_progress', 'to_review', 'completed', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'invalid sprint status (DD2-155: new|planned|in_progress|to_review|completed|cancelled)');
END;

-- 3) Backlog (Issues): done → completed (alle anderen Status unverändert).
UPDATE backlog SET status = 'completed' WHERE status = 'done';

CREATE TRIGGER trg_backlog_status_insert
BEFORE INSERT ON backlog
FOR EACH ROW WHEN NEW.status IS NOT NULL
  AND NEW.status NOT IN ('new', 'refined', 'planned', 'in_progress', 'to_review', 'passed', 'rejected', 'completed', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'invalid issue status (DD2-155: new|refined|planned|in_progress|to_review|passed|rejected|completed|cancelled)');
END;

CREATE TRIGGER trg_backlog_status_update
BEFORE UPDATE OF status ON backlog
FOR EACH ROW WHEN NEW.status IS NOT NULL
  AND NEW.status NOT IN ('new', 'refined', 'planned', 'in_progress', 'to_review', 'passed', 'rejected', 'completed', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'invalid issue status (DD2-155: new|refined|planned|in_progress|to_review|passed|rejected|completed|cancelled)');
END;
