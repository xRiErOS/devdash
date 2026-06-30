-- Down zu 070: status-Spalte aus documents + user_notes entfernen.
-- SQLite unterstützt DROP COLUMN seit 3.35 (better-sqlite3 ≥ 12 bündelt das).
ALTER TABLE documents DROP COLUMN status;
ALTER TABLE user_notes DROP COLUMN status;
