-- DD-17: Bild-/Datei-Anhänge an Backlog-Items.
-- Pendant zu review_screenshots, aber direkt am Issue (für PO-Notizen + Issue-Erfassung).

CREATE TABLE IF NOT EXISTS backlog_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backlog_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backlog_attachments_backlog ON backlog_attachments(backlog_id);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('005_v3_backlog_attachments');
