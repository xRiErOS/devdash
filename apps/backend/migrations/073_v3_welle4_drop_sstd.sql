-- Welle 4 T01 / D21: SSTD-Subsystem entfernen.
-- Die Session-State-Transfer-Schicht (Slots + Journal + Legacy-Content-Blob) wird
-- ersatzlos entfernt: Handover läuft on-demand über den /next-session-prompt-Skill,
-- Wissensbasis ist project_memory + Git-Historie (kein SSTD-Store mehr, Decision D21).
-- Rückbau der Migrationen 043 (project_sstd_slots) und 026 (projects.sstd_content /
-- projects.sstd_updated_at). Kein Index/Trigger/View referenziert die projects-Spalten
-- (nur project_sstd_slots trug einen eigenen Index, der mit der Tabelle fällt).
-- sqlite >= 3.35 (Prod/Dev 3.53) → DROP COLUMN.
DROP TABLE IF EXISTS project_sstd_slots;
ALTER TABLE projects DROP COLUMN sstd_content;
ALTER TABLE projects DROP COLUMN sstd_updated_at;
