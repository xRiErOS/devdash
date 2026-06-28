-- 063_v3_dd2_130_description_to_po_notes.sql — DD2-130 (Sprint DD2#24)
-- Rettet versehentlich im description-Feld gepflegte PO-Infos nach po_notes,
-- BEVOR Migration 064 (DD2-131) die Spalte backlog.description droppt.
--
-- Scope: NUR project_id=10 (devd2). Heuristik: PO arbeitet erst seit dem
-- DD2-Clean-Cut (2026-06-25) aktiv an der TUI und legt darüber Issues an —
-- ältere description-Inhalte sind echte Beschreibungen und bleiben unangetastet.
-- Cutoff absolut '2026-06-25' (robuster als date('now','-3 days'), das vom
-- Deploy-Zeitpunkt abhinge; Sprint-Datum 2026-06-28).
-- NB: backlog hat KEINE updated_at-Spalte → Auswahl allein über created_at.
--
-- Merge-Regel (Q01, PO 2026-06-28 = ANHÄNGEN):
--   po_notes leer  → po_notes = description
--   po_notes gefüllt → po_notes = po_notes || '\n\n---\n' || description
--
-- Reversibilität: betroffene Rows (id + alt-Werte) werden vor der Mutation in
-- _dd2_130_desc_to_po_notes_backup gesichert (zusätzlich zum Full-DB-Backup,
-- das scripts/migrate.js anlegt). Restore: UPDATE backlog SET po_notes = b.old_po_notes
-- FROM _dd2_130_desc_to_po_notes_backup b WHERE backlog.id = b.id.

CREATE TABLE IF NOT EXISTS _dd2_130_desc_to_po_notes_backup (
  id             INTEGER PRIMARY KEY,
  project_number INTEGER,
  old_po_notes   TEXT,
  old_description TEXT,
  created_at     TEXT,
  migrated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO _dd2_130_desc_to_po_notes_backup
  (id, project_number, old_po_notes, old_description, created_at)
SELECT id, project_number, po_notes, description, created_at
FROM backlog
WHERE project_id = 10
  AND description IS NOT NULL AND TRIM(description) <> ''
  AND created_at >= '2026-06-25';

UPDATE backlog
SET po_notes = CASE
    WHEN po_notes IS NULL OR TRIM(po_notes) = '' THEN description
    ELSE po_notes || char(10) || char(10) || '---' || char(10) || description
  END
WHERE id IN (SELECT id FROM _dd2_130_desc_to_po_notes_backup);
