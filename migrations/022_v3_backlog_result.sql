-- ADR 2026-04-29: backlog.result als Hybrid YAML-Frontmatter + Markdown-Body.
-- Macht abgeschlossene Issues zur durchsuchbaren Knowledge-Base
-- (outcome_summary, outcome_type, files_changed, commits, lessons_learned, ...).
-- Schema: TEXT-Feld, NULL erlaubt (Backfill optional via CLI/UI).
ALTER TABLE backlog ADD COLUMN result TEXT;
