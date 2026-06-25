-- 033_v3_milestone_deferred.sql — DD-291 Milestone Defer-Flag
-- Adds boolean `deferred` column to milestones for "Zurückstellen"-Workflow.
-- Defer-Flag ist orthogonal zu open/reached/cancelled (D01) und projekt-global (D05).
-- D02: Auto-Defer existiert nicht — Wert wird nur via expliziter PO-Aktion gesetzt.
--
-- SQLite-Konvention: deferred als INTEGER (0/1) statt BOOLEAN (Native-Affinity).
-- NOT NULL DEFAULT 0 → bestehende Milestones bleiben sichtbar.
-- Index für den Filter `deferred=0` (Default-View) und `deferred=1` (Indikator-Pill).

ALTER TABLE milestones ADD COLUMN deferred INTEGER NOT NULL DEFAULT 0 CHECK(deferred IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_milestones_deferred ON milestones(project_id, deferred);
