-- 060_v3_heal_passed_verdict_divergence.sql
--
-- Einmaliger Daten-Heal: Verdict↔Status-Divergenz (DD#81-Trap-Rest / SPF-161).
--
-- Vor dem Symmetrie-Fix in server/lib/reviewMarker.js zog ein not_passed-Verdict
-- nur to_review→rejected, NICHT passed→rejected. Dadurch konnten Issues mit
-- backlog.status='passed' neben einer jüngsten Review-Runde 'not_passed' hängen
-- bleiben — eine via MCP nicht reparierbare Divergenz (passed kennt rückwärts nur
-- →done/→planned, Edit-Gate 409, Reopen braucht to_review 422).
--
-- Dieser Heal richtet den Bestand am Verdict aus (das Verdict führt): jedes
-- 'passed'-Issue, dessen JÜNGSTE Runde 'not_passed' trägt, wird auf 'rejected'
-- gezogen — denselben Zielzustand, den der gefixte autoSetRejectedOnReviewFail
-- künftig direkt setzt. 'rejected' ist reworkbar (→in_progress/→planned) und kann
-- über ein späteres passed-Verdict wieder auf 'passed' wandern.
--
-- Multi-Tenant: läuft über die gesamte DB (alle Projekte), trifft aktuell die
-- eine bekannte divergente Zeile (SPF-161, Projekt Sproutling).
--
-- Idempotent: erneutes Ausführen ist ein No-Op — nach dem ersten Lauf stehen die
-- betroffenen Zeilen auf 'rejected' und werden vom WHERE status='passed' nicht
-- mehr erfasst.

UPDATE backlog
SET status = 'rejected'
WHERE status = 'passed'
  AND id IN (
    SELECT rf.backlog_id
    FROM review_feedback rf
    WHERE rf.id = (
      SELECT rf2.id
      FROM review_feedback rf2
      WHERE rf2.backlog_id = rf.backlog_id
      ORDER BY rf2.round_number DESC, rf2.id DESC
      LIMIT 1
    )
    AND rf.review_status = 'not_passed'
  );
