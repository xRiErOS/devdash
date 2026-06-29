-- 068_v3_dd2_108_drop_component_notes.sql — DD2-108 (Sprint DD2#28)
-- Hard-Drop des component_notes-Features (Backend-Routes, CLI, MCP-Tools, Lib bereits
-- entfernt). Die Tabelle wurde via Migration 040 angelegt (M3-S02 T01, DD-273) und ist
-- auf Prod-DBs bereits applied → hier forward-only droppen (040 bleibt in der History).
--
-- Sicher: kein Index/FTS/Trigger/FK von anderen Tabellen referenziert component_notes
-- (nur self-FK auf projects). Indizes fallen automatisch mit der Tabelle, explizit für
-- Klarheit + ältere SQLite. Idempotent via IF EXISTS (fresh DB hat die Tabelle dank 040,
-- aber sicher ist sicher).

DROP INDEX IF EXISTS idx_component_notes_project_slug_active;
DROP INDEX IF EXISTS idx_component_notes_project;
DROP TABLE IF EXISTS component_notes;
