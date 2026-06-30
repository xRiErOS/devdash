-- DD2-226 (DD2#41): Doc-Status folgt automatisch dem Entity-Status (Meilenstein/Sprint).
--
-- Bisher war documents.status (draft|active|archived, Mig. 070) disjunkt vom Entity-Status
-- (new|planned|in_progress|to_review|completed|cancelled) — manuelle Pflege nötig.
--
-- Mapping (PO-Entscheidung 2026-06-30, Sprint DD2#41):
--   completed | cancelled              -> archived
--   new ("open")                       -> draft
--   planned | in_progress | to_review  -> active
-- Reopen (completed -> in_progress) ist davon abgedeckt (in_progress -> active).
--
-- Realisierung als DB-Trigger (AFTER UPDATE OF status), nicht als App-Logik: der Status
-- wird an mehreren Stellen geschrieben (api.js Sprint-PATCH, milestoneLifecycle Cascade-
-- Complete, milestoneClose) — ein Trigger deckt alle Pfade robust ab (gleiche Linie wie
-- der Status-Unify-Trigger aus Mig. 069).
--
-- Das KASKADIERENDE LÖSCHEN (Entity-Delete -> Docs weg) ist bereits durch die FKs
-- documents.milestone_id/sprint_id ON DELETE CASCADE (Mig. 067, foreign_keys=ON) abgedeckt
-- — hier nichts weiter nötig.

-- 1) Backfill: bestehende Docs einmalig auf den aktuellen Owner-Status ausrichten.
UPDATE documents
SET status = CASE (SELECT s.status FROM sprints s WHERE s.id = documents.sprint_id)
    WHEN 'completed' THEN 'archived'
    WHEN 'cancelled' THEN 'archived'
    WHEN 'new'       THEN 'draft'
    ELSE 'active'
  END,
  updated_at = datetime('now')
WHERE sprint_id IS NOT NULL;

UPDATE documents
SET status = CASE (SELECT m.status FROM milestones m WHERE m.id = documents.milestone_id)
    WHEN 'completed' THEN 'archived'
    WHEN 'cancelled' THEN 'archived'
    WHEN 'new'       THEN 'draft'
    ELSE 'active'
  END,
  updated_at = datetime('now')
WHERE milestone_id IS NOT NULL;

-- 2) Sprint-Status-Wechsel -> Docs des Sprints nachziehen.
CREATE TRIGGER trg_documents_follow_sprint_status
AFTER UPDATE OF status ON sprints
FOR EACH ROW WHEN NEW.status <> OLD.status
BEGIN
  UPDATE documents
  SET status = CASE NEW.status
      WHEN 'completed' THEN 'archived'
      WHEN 'cancelled' THEN 'archived'
      WHEN 'new'       THEN 'draft'
      ELSE 'active'
    END,
    updated_at = datetime('now')
  WHERE sprint_id = NEW.id;
END;

-- 3) Meilenstein-Status-Wechsel -> Docs des Meilensteins nachziehen.
CREATE TRIGGER trg_documents_follow_milestone_status
AFTER UPDATE OF status ON milestones
FOR EACH ROW WHEN NEW.status <> OLD.status
BEGIN
  UPDATE documents
  SET status = CASE NEW.status
      WHEN 'completed' THEN 'archived'
      WHEN 'cancelled' THEN 'archived'
      WHEN 'new'       THEN 'draft'
      ELSE 'active'
    END,
    updated_at = datetime('now')
  WHERE milestone_id = NEW.id;
END;
