-- DD-307 (M3-S01 T09) Down-Migration: spec_path-Spalte entfernen.
-- SQLite ALTER TABLE DROP COLUMN seit 3.35 (Mai 2021) verfügbar.

DROP INDEX IF EXISTS idx_milestones_spec_path;
ALTER TABLE milestones DROP COLUMN spec_path;
