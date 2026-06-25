-- DD-278 (M3-S01 T01): project_todos + todo_links — Project-Home ToDo-Liste mit verlinkbaren Targets.
-- D-T08-01 (DD#39 Mockup-Review v2 2026-05-23): status TEXT 'open'|'done'|'cancelled' (eigener Lifecycle,
--   NICHT Issue-Lifecycle).
-- todo_links: 4 Typen 'spec'|'issue'|'vault'|'url' (DD#39 D07).
-- Migration-Nummer 037 statt 032 (Spec): 032-036 sind seit 2026-05-23/24 belegt
--   (api_keys, milestone_deferred, backlog_acceptance_criteria, subtasks, description_soft_deprecated).
-- Tabellen-Reihenfolge: project_todos ZUERST (todo_links referenziert via FK).

CREATE TABLE project_todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done', 'cancelled')),
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_project_todos_project ON project_todos(project_id, position);
CREATE INDEX idx_project_todos_open ON project_todos(project_id, status) WHERE status = 'open';

CREATE TABLE todo_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL REFERENCES project_todos(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('spec', 'issue', 'vault', 'url')),
  target TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_todo_links_todo ON todo_links(todo_id, position);
