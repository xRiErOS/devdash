-- DD-25: Soft-Delete für Backlog-Items.
-- Issues werden in einen Papierkorb verschoben statt hart geloescht.
-- Wiederherstellung via UPDATE deleted_at = NULL.
-- Endgueltiges Loeschen weiterhin via DELETE FROM backlog (Force-Pfad).

ALTER TABLE backlog ADD COLUMN deleted_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_backlog_deleted_at ON backlog(deleted_at);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('007_v3_soft_delete');
