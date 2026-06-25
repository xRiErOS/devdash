-- DD-273 (M3-S02 T01) Down-Migration: component_notes-Tabelle entfernen.

DROP INDEX IF EXISTS idx_component_notes_project_slug_active;
DROP INDEX IF EXISTS idx_component_notes_project;
DROP TABLE IF EXISTS component_notes;
