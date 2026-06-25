-- DD-307 (M3-S01 T09): milestones.spec_path — optionaler Pfad zu Spec-Markdown-Datei
-- relativ zum projects.repo_path. UI rendert klickbaren Spec-Link in MilestoneCard.
--
-- Migration-Nummer 039 statt 034 (Spec): 034 belegt seit 2026-05-24 (backlog_acceptance_criteria).
-- Additiv (ADD COLUMN), nullable, kein Backfill. Safe.

ALTER TABLE milestones ADD COLUMN spec_path TEXT;

CREATE INDEX IF NOT EXISTS idx_milestones_spec_path ON milestones(project_id) WHERE spec_path IS NOT NULL;
