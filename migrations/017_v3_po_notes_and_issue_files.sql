-- DD-129: po_notes als separate Spalte + issue_files als eigene Tabelle.
-- Strikte Trennung PO-Notizen ↔ Context Notes.
-- Relevant Files weg von JSON-Blob hin zu relationaler Tabelle.

ALTER TABLE backlog ADD COLUMN po_notes TEXT;

CREATE TABLE IF NOT EXISTS issue_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_issue_files_issue ON issue_files(issue_id);

-- Migration: bestehende relevant_files (JSON) in issue_files migrieren.
-- json_each() iteriert über JSON-Arrays. Position = key (0-basiert).
INSERT INTO issue_files (issue_id, path, position)
SELECT b.id, je.value, je.key
FROM backlog b, json_each(b.relevant_files) je
WHERE b.relevant_files IS NOT NULL
  AND b.relevant_files != ''
  AND b.relevant_files != '[]'
  AND json_valid(b.relevant_files) = 1;
