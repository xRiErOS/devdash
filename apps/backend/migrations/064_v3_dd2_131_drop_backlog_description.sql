-- 064_v3_dd2_131_drop_backlog_description.sql — DD2-131 (Sprint DD2#24)
-- Hard-Drop der Spalte backlog.description. PO-Entscheidung Q02 (2026-06-28):
-- Feld vollständig nicht mehr verfügbar — revidiert die D30-Soft-Deprecate-
-- Audit-Policy (Migration 036). po_notes ist der einzige PO-Freitext-Kanal.
--
-- VORAUSSETZUNG: Migration 063 (DD2-130) hat etwaige description-Inhalte zuvor
-- nach po_notes gerettet + in _dd2_130_desc_to_po_notes_backup gesichert (läuft
-- garantiert vorher, da 063 < 064 sortiert).
--
-- Sicher: kein Index/FTS/Trigger referenziert backlog.description (verifiziert).
-- SQLite >= 3.35 unterstützt ALTER TABLE DROP COLUMN.
-- Capture-Pfad (POST /api/issues) bleibt funktionsfähig: dort ist `description`
-- nur ein Wire-Alias der PWA, der nach po_notes gemappt wird — keine Spalten-I/O.

ALTER TABLE backlog DROP COLUMN description;
