-- 051_v3_project_summary_fields.sql
--
-- DD-490: User-editable project summary + vision/goals prose (persisted, NOT AI-generated).
--
-- Project-Home Overview ("Was wurde erreicht" / "Nächste Schritte") und die
-- Vision-&-Goals-Card werden nutzer-editierbar und überleben einen Reload.
-- Bewusst KEIN ai_-Präfix: Migration 049 (DD-522, PO-Decision D49) hat die alten
-- AI-Auto-Gen-Spalten (ai_summary/ai_next_steps) entfernt. Diese Felder tragen
-- USER-Prosa, semantisch verschieden — die AI-Semantik darf nicht wiederbelebt
-- werden.
--
-- Additive, nullable, kein Backfill.

ALTER TABLE projects ADD COLUMN summary_achieved TEXT;
ALTER TABLE projects ADD COLUMN summary_next TEXT;
ALTER TABLE projects ADD COLUMN vision TEXT;
ALTER TABLE projects ADD COLUMN goals TEXT;   -- newline-delimited (one goal per line)
