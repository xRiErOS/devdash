-- 050_v3_cancelled_unification_down.sql (reverse)
--
-- DECISION: Diese Migration ist IRREVERSIBEL → der Down ist ein bewusster
-- No-Op.
--
-- Der Forward-Schritt (UPDATE backlog SET status='cancelled' WHERE
-- deleted_at IS NOT NULL) verschmilzt zwei vormals getrennte Mengen:
--   (a) regulär gecancelte Items (status='cancelled', deleted_at IS NULL)
--   (b) soft-deletete Items (deleted_at IS NOT NULL)
-- Nach dem UPDATE ist nicht mehr unterscheidbar, welche cancelled-Zeilen aus
-- (a) und welche aus (b) stammen. Ein automatischer Reverse würde fälschlich
-- ALLE cancelled-Items soft-deleten (Datenkorruption für Menge (a)).
--
-- Recovery-Pfad bei Bedarf: aus dem vom Migration-Runner erzeugten Auto-Backup
-- restaurieren. Die Spalte backlog.deleted_at + Index bleiben physisch erhalten
-- (Forward droppt sie nicht), eine schematische Rückwärtsmigration ist daher
-- nicht nötig.

-- Bewusster No-Op (kein DDL/DML).
SELECT 1;
