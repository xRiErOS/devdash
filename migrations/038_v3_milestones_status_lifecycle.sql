-- DD-306 (M3-S01 T08): Milestone-Lifecycle planning|active|completed|cancelled.
-- D03 (DD#39 Mockup-Review v2 2026-05-23): SprintStatusCard filtert sprint.active AND milestone.active.
-- Ersetzt das bestehende Wert-Schema 'open'|'reached'|'cancelled' durch den
-- expliziten 4-Stufen-Lifecycle aus Spec A Sektion 4 (DD-306 context_notes).
--
-- Migration-Nummer 038 statt 033 (Spec): 033 ist seit 2026-05-23 belegt (milestone_deferred).
--
-- Vorgehen: ALTER-TABLE-Recreate (SQLite kann CHECK-Constraint nicht ALTER), mit Backfill:
--   open      → planning   (noch nicht abgeschlossen)
--   reached   → completed  (Terminal-Stati identisch)
--   cancelled → cancelled  (Identität)
--
-- migrationRunner.js setzt PRAGMA foreign_keys=OFF während dieser Migration
-- (registriert in FK_OFF_DURING_APPLY analog zu 029), prüft danach foreign_key_check.
--
-- Aktuelles Schema nach 029 + 033: id, project_id (FK projects), name, description,
-- target_date DATE NOT NULL, status TEXT DEFAULT 'open', created_at DATETIME,
-- position INTEGER, deferred INTEGER NOT NULL DEFAULT 0 CHECK(0,1),
-- UNIQUE(project_id, name).

CREATE TABLE milestones_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'completed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  position INTEGER,
  deferred INTEGER NOT NULL DEFAULT 0 CHECK(deferred IN (0, 1)),
  UNIQUE(project_id, name)
);

INSERT INTO milestones_new (id, project_id, name, description, target_date, status, created_at, position, deferred)
SELECT
  id,
  project_id,
  name,
  description,
  target_date,
  CASE status
    WHEN 'open' THEN 'planning'
    WHEN 'reached' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'planning'
  END,
  created_at,
  position,
  deferred
FROM milestones;

DROP TABLE milestones;
ALTER TABLE milestones_new RENAME TO milestones;

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_position ON milestones(project_id, position);
CREATE INDEX IF NOT EXISTS idx_milestones_deferred ON milestones(project_id, deferred);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(project_id, status) WHERE status IN ('active', 'planning');
