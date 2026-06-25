-- DD-Erik-Feedback: Erste Klasse "Milestone".
-- Sprints werden Milestones zugeordnet; backlog.milestone wird denormalisierter
-- Cache (gesetzt vom Backend, wenn Sprint einem Milestone zugeordnet ist).

CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'open',  -- open | reached | cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);

-- sprints bekommt milestone_id (nullable). FK on delete SET NULL, damit das
-- Loeschen eines Milestones den Sprint nicht abreisst.
ALTER TABLE sprints ADD COLUMN milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sprints_milestone ON sprints(milestone_id);
