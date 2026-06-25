-- DD-253 (T01 in M02-S01): target_date wird Pflichtfeld auf Schema-Ebene.
-- Backfill: bestehende NULL/leere target_date werden mit (created_at + 90 Tage) gefüllt.
-- Master-SSTD D09, Session D02 (2026-05-22): scripts/migrate.js schreibt Pre/Post-Dump
-- nach data/migrations-log/ via server/lib/migrationRunner.js Hooks (R01-Mitigation).
--
-- SQLite kann ALTER COLUMN ... NOT NULL nicht direkt — Tabellen-Neuanlage Pattern.
-- migrationRunner.js setzt PRAGMA foreign_keys=OFF während dieser Migration (FK_OFF_DURING_APPLY),
-- prüft danach foreign_key_check und re-enabled.

CREATE TABLE milestones_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  position INTEGER,
  UNIQUE(project_id, name)
);

INSERT INTO milestones_new (id, project_id, name, description, target_date, status, created_at, position)
SELECT
  id,
  project_id,
  name,
  description,
  COALESCE(NULLIF(target_date, ''), date(created_at, '+90 days')),
  status,
  created_at,
  position
FROM milestones;

DROP TABLE milestones;
ALTER TABLE milestones_new RENAME TO milestones;

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_position ON milestones(project_id, position);
