-- DD-92: Sprint-Anzeige "Sprint-<N> — <Title>" mit projekt-relativer Nummer.
-- Schema: sprints.project_number (INTEGER), UNIQUE(project_id, project_number).
-- Backfill: bestehende Sprints kriegen project_number per ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY position, id).
-- Title-Normalisierung: "Sprint X — Title" → "Title" (em-dash und ASCII-dash).

ALTER TABLE sprints ADD COLUMN project_number INTEGER;

-- Backfill project_number
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY position, id) AS pn
  FROM sprints
)
UPDATE sprints SET project_number = (SELECT pn FROM numbered WHERE numbered.id = sprints.id);

-- Title-Normalisierung: "Sprint <N> — Rest" → "Rest"
-- em-dash Variante (" — ")
UPDATE sprints
   SET name = TRIM(SUBSTR(name, INSTR(name, ' — ') + LENGTH(' — ')))
 WHERE name LIKE 'Sprint %' AND INSTR(name, ' — ') > 0;

-- ASCII-dash Variante (" - ")
UPDATE sprints
   SET name = TRIM(SUBSTR(name, INSTR(name, ' - ') + LENGTH(' - ')))
 WHERE name LIKE 'Sprint %' AND INSTR(name, ' - ') > 0;

CREATE UNIQUE INDEX idx_sprints_project_number ON sprints(project_id, project_number);
