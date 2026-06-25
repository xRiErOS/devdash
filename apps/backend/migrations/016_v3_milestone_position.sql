-- DD-135: milestones bekommt eine sortierbare position-Spalte (analog sprints.position).
-- Default = id (für Bestandsdaten); neue Milestones bekommen MAX(position)+1.

ALTER TABLE milestones ADD COLUMN position INTEGER;

UPDATE milestones SET position = id WHERE position IS NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_project_position ON milestones(project_id, position);
