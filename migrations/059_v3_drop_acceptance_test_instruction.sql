-- 059_v3_drop_acceptance_test_instruction.sql - E01.2 / D09 harter Replace
-- Die issue-level Prosa-Felder acceptance_criteria (mig 034) + test_instruction
-- (mig 023) werden durch user_stories[].qa (mig 058, Single-Source per-US-
-- Pruefgrundlage) abgeloest. Single-User, Datenverlust akzeptiert (PO 2026-06-22,
-- kein Backfill). Alle Consumer (contracts/api/CLI/MCP/Frontend/Tests) sind im
-- selben Branch feat/e01-user-stories angepasst.
-- SQLite >= 3.35 unterstuetzt ALTER TABLE DROP COLUMN; keine Indizes/FTS/Trigger
-- referenzieren diese Spalten.

ALTER TABLE backlog DROP COLUMN acceptance_criteria;
ALTER TABLE backlog DROP COLUMN test_instruction;
