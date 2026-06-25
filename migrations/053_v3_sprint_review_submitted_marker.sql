-- 053_v3_sprint_review_submitted_marker.sql
--
-- DD-507: Sprint-level Review-Abschluss-Marker.
--
-- Eine Review-Iteration eines Sprints ist OFFEN solange review_submitted_at
-- NULL ist, und SUBMITTED sobald sie einen Timestamp traegt. Dieser Marker ist
-- die Single-Source fuer den dynamischen Header-Button (open → "Review
-- abschliessen", submitted → "Review kopieren"). Die Iterations-Historie bleibt
-- aus review_feedback-Runden + audit_log ableitbar; gespeichert wird nur der
-- aktuelle Zustand.
--
-- Additive, nullable, kein Backfill.

ALTER TABLE sprints ADD COLUMN review_submitted_at TEXT;
