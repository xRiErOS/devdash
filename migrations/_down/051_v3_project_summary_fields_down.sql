-- 051_v3_project_summary_fields_down.sql (reverse)
--
-- DD-490 (reverse): Die 4 User-Prosa-Spalten wieder entfernen.
-- SQLite >= 3.35 unterstützt DROP COLUMN nativ.

ALTER TABLE projects DROP COLUMN summary_achieved;
ALTER TABLE projects DROP COLUMN summary_next;
ALTER TABLE projects DROP COLUMN vision;
ALTER TABLE projects DROP COLUMN goals;
