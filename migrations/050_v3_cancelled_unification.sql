-- 050_v3_cancelled_unification.sql
--
-- DD-524: Vereinheitlichung von Soft-Delete (backlog.deleted_at) in den
-- einheitlichen cancelled-Status. Soft-gelöschte Backlog-Items werden zu
-- regulären cancelled-Items migriert; das Backlog kennt fortan nur noch den
-- Lifecycle-Status 'cancelled' statt eines separaten Papierkorb-Flags.
--
-- DESTRUKTIV (datenverdichtend): Nach dieser Migration ist nicht mehr
-- unterscheidbar, welche cancelled-Items vormals soft-deleted waren und welche
-- regulär gecancelt wurden. Der Migration-Runner legt ein Auto-Backup an.
--
-- Die Spalte backlog.deleted_at und der Index idx_backlog_deleted_at bleiben
-- BEWUSST erhalten (vestigial): Ein DROP COLUMN ist in SQLite teuer/riskant
-- (Tabellen-Rebuild) und ausserhalb des Scope. Es werden lediglich keine neuen
-- deleted_at-Werte mehr geschrieben (siehe server/api.js, DD-524).

UPDATE backlog SET status = 'cancelled' WHERE deleted_at IS NOT NULL;
