-- Welle 4 T02 / D20: DD-DB-SOP-Subsystem entfernen.
-- Die generische Prozedur lebt jetzt als Skill-Ordner-PROCEDURE.md
-- (~/.claude/skills/run-sprint/PROCEDURE.md, global/git/cross-project),
-- projekt-spezifische Teile liegen in /docs. Der DB-SOP-Store ist damit obsolet
-- (Decision D20). SOP-Collections waren leer.
-- Rückbau der Migrationen 044 (sops + sop_triggers), 047 (Seed-Row, fällt mit der
-- Tabelle) und 061 (sop_collections + sop_collection_items).
-- FK-sichere Reihenfolge: Kinder vor Eltern. Keine andere Tabelle hat einen FK
-- in die SOP-Tabellen (verifiziert), der den Drop blockieren würde.
DROP TABLE IF EXISTS sop_collection_items;
DROP TABLE IF EXISTS sop_triggers;
DROP TABLE IF EXISTS sop_collections;
DROP TABLE IF EXISTS sops;
