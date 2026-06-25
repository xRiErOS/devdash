-- 052_v3_review_verdict_binary_down.sql (reverse)
--
-- DECISION: Diese Migration ist IRREVERSIBEL → der Down ist ein bewusster
-- No-Op.
--
-- Der Forward-Schritt (UPDATE review_feedback SET review_status='not_passed'
-- WHERE review_status IN ('partially_passed','rejected')) verschmilzt drei
-- vormals getrennte Mengen zu 'not_passed':
--   (a) regulär als not_passed bewertete Runden
--   (b) partially_passed-Runden (Zwischenstufe, abgeschafft)
--   (c) rejected-Runden (alt-/fehlbenannter Verdict)
-- Nach dem UPDATE ist nicht mehr unterscheidbar, welche not_passed-Zeile aus
-- (a), (b) oder (c) stammt. Ein automatischer Reverse würde fälschlich ALLE
-- not_passed-Zeilen auf einen einzigen Vorzustand zurücksetzen (Datenkorruption).
--
-- Recovery-Pfad bei Bedarf: aus dem vom Migration-Runner erzeugten Auto-Backup
-- restaurieren.

-- Bewusster No-Op (kein DDL/DML).
SELECT 1;
