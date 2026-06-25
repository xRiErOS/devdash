-- DD-273 (M3-S02 T01): component_notes — persistente Markdown-Notes pro data-ui-Slug
-- für Debug-Mode (Wiki 40.03 Baustein Notes-Panel + 40.01 data-ui Konvention).
-- Pro (project_id, slug) maximal eine aktive Note. Soft-Delete via deleted_at.
-- Migration-Nummer 040 (vorgängig: 039_v3_milestones_spec_path.sql).

CREATE TABLE component_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE UNIQUE INDEX idx_component_notes_project_slug_active
  ON component_notes(project_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_component_notes_project ON component_notes(project_id);
