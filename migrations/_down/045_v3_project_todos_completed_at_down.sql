-- DD-363 Down-Migration: completed_at-Spalte von project_todos entfernen.

ALTER TABLE project_todos DROP COLUMN completed_at;
