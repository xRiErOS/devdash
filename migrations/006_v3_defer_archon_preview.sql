-- Migration 006: Archon + Live-Preview deferred (ADR 2026-04-26)
--
-- Entfernt Schema-Artefakte der zurückgestellten Features. Daten in archon_runs
-- und ui_target gehen verloren — beides ist akzeptabel, da Archon-Workflows
-- noch nicht produktiv genutzt wurden und Live-Preview-Pins nur experimentell
-- erfasst waren. Reaktivierung über Re-Migration (siehe Vault-Doku).

-- Live-Preview: ui_target-Spalte aus review_feedback entfernen
ALTER TABLE review_feedback DROP COLUMN ui_target;

-- Archon: Workflow-spezifische Spalte und Run-Tabelle entfernen
ALTER TABLE review_feedback DROP COLUMN submitted_to_archon_at;

DROP INDEX IF EXISTS idx_archon_runs_project;
DROP TABLE IF EXISTS archon_runs;

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('006_v3_defer_archon_preview');
