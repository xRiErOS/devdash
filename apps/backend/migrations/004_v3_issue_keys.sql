-- Issue-Keys: Prefix pro Projekt (z.B. "MBT", "DD") + lokale fortlaufende Nummer
-- pro Projekt. Anzeige als "MBT-42" / "DD-7". Globale id bleibt technischer PK.

ALTER TABLE projects ADD COLUMN prefix TEXT;

UPDATE projects SET prefix = 'MBT' WHERE slug = 'mybaby';
UPDATE projects SET prefix = 'DD'  WHERE slug = 'devd';

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_prefix ON projects(prefix);

ALTER TABLE backlog ADD COLUMN project_number INTEGER;

-- Backfill: pro Projekt lokal numerieren in Reihenfolge der globalen id.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id) AS rn
  FROM backlog
)
UPDATE backlog
SET project_number = (SELECT rn FROM numbered WHERE numbered.id = backlog.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_project_number
  ON backlog(project_id, project_number);
