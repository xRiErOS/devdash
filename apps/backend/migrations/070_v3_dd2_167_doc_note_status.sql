-- DD2-167 / DD2-168 (Sprint DD2#32 Rework): status-Spalte für documents + user_notes.
-- PO-Befund im Review: der Detail-/Header-Bereich beider Browser soll neben
-- Created/Updated auch einen Status zeigen. Beide Tabellen hatten bisher KEINE
-- status-Spalte (Migration 067 documents, 066 user_notes) → hier nachgezogen.
--
-- Eigener, schlanker Lifecycle (NICHT der Issue-/Sprint-Lifecycle): draft | active |
-- archived. Default 'active' (bestehende Zeilen werden als aktiv gewertet).
--
-- ALTER TABLE ADD COLUMN mit CHECK ist in SQLite zulässig (CHECK referenziert nur
-- die eigene Spalte, Default erfüllt den CHECK). Kein Table-Recreate nötig → die
-- user_notes-FTS (external-content) + Trigger bleiben unangetastet (sie indizieren
-- nur title+details).

ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('draft', 'active', 'archived'));

ALTER TABLE user_notes ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('draft', 'active', 'archived'));
