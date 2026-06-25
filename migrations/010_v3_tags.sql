-- DD-29: Tag-System pro Projekt. Ersetzt plugin_key durch flexibles
-- Multi-Tag-System. plugin_key wird beibehalten (Backwards-Compat) und
-- spaeter (separate Migration) gedroppt.

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'mauve',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_project ON tags(project_id);

CREATE TABLE IF NOT EXISTS backlog_tags (
  backlog_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (backlog_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_backlog_tags_backlog ON backlog_tags(backlog_id);
CREATE INDEX IF NOT EXISTS idx_backlog_tags_tag ON backlog_tags(tag_id);

-- Bestehende plugin_key-Werte als Tags importieren (idempotent durch UNIQUE).
INSERT OR IGNORE INTO tags (project_id, name, color)
  SELECT DISTINCT project_id, plugin_key, 'mauve'
  FROM backlog
  WHERE plugin_key IS NOT NULL AND TRIM(plugin_key) != '';

-- Items mit den entsprechenden Tags verknuepfen.
INSERT OR IGNORE INTO backlog_tags (backlog_id, tag_id)
  SELECT b.id, t.id FROM backlog b
  JOIN tags t ON t.project_id = b.project_id AND t.name = b.plugin_key
  WHERE b.plugin_key IS NOT NULL AND TRIM(b.plugin_key) != '';

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('010_v3_tags');
