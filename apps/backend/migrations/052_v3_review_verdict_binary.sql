-- 052_v3_review_verdict_binary.sql
--
-- DD-506: Review-Verdict binär — partially_passed abgeschafft.
--
-- Das Review-Verdict kennt fortan nur noch zwei Ausprägungen: 'passed' und
-- 'not_passed' (plus 'pending' als Noch-nicht-bewertet). Legacy-Werte werden
-- auf die binäre Realität normalisiert:
--   - 'partially_passed' (Zwischenstufe, abgeschafft) → 'not_passed'
--   - 'rejected'         (alt-/fehlbenannter Verdict) → 'not_passed'
--
-- WICHTIG: Betrifft ausschliesslich review_feedback.review_status (Review-
-- Verdict). Der Lifecycle-Status backlog.status='rejected' (to_review→rejected→
-- in_progress) ist ein ANDERES Feld und bleibt unberührt.
--
-- Idempotent: erneutes Ausführen ist ein No-Op (nach dem ersten Lauf gibt es
-- weder 'partially_passed' noch 'rejected' in review_feedback.review_status).

UPDATE review_feedback SET review_status = 'not_passed' WHERE review_status IN ('partially_passed', 'rejected');
