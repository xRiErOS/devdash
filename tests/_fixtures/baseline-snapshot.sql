CREATE TABLE sprints (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planning',  -- planning, active, closed
  capacity INTEGER,
  notes TEXT
, position INTEGER, project_id INTEGER REFERENCES projects(id), milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL, wip_limit INTEGER, project_number INTEGER, goal TEXT);
CREATE TABLE backlog (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,  -- feature, bug, refactor, chore, security
  description TEXT,
  priority INTEGER DEFAULT 3,  -- 1 (critical) to 5 (low)
  milestone TEXT,  -- v0.1.0, v0.2.0, etc.
  assigned_sprint INTEGER REFERENCES sprints(id),
  status TEXT DEFAULT 'open',  -- open, in_progress, done, blocked, deferred
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
, plugin_key TEXT, goal TEXT, background TEXT, relevant_files TEXT, context_notes TEXT, refined_at DATETIME, project_id INTEGER REFERENCES projects(id), project_number INTEGER, deleted_at DATETIME, po_notes TEXT, result TEXT, test_instruction TEXT, created_by_user TEXT);
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  backlog_id INTEGER REFERENCES backlog(id),
  sprint_id INTEGER REFERENCES sprints(id),
  title TEXT NOT NULL,
  assignee TEXT,  -- agent name or sub-agent ID
  status TEXT DEFAULT 'todo',  -- todo, in_progress, blocked, done
  effort INTEGER,  -- story points
  started_at DATETIME,
  completed_at DATETIME,
  validation_output TEXT,  -- proof of completion
  notes TEXT
);
CREATE TABLE decisions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  rationale TEXT,
  alternatives TEXT,  -- JSON
  status TEXT DEFAULT 'active',  -- active, reversed, superseded
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE conversation_snapshots (
  id INTEGER PRIMARY KEY,
  agent_id TEXT,
  session_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  summary TEXT,
  decisions_made TEXT,  -- JSON array
  next_session_goals TEXT
);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  agent_id TEXT,
  action TEXT,
  table_name TEXT,
  record_id INTEGER,
  old_value TEXT,
  new_value TEXT
);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE review_screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL REFERENCES review_feedback(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
CREATE TABLE schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
CREATE TABLE issue_dependencies (
  id INTEGER PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  depends_on_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(issue_id, depends_on_id),
  CHECK(issue_id != depends_on_id)
);
CREATE INDEX idx_deps_issue ON issue_dependencies(issue_id);
CREATE INDEX idx_deps_depends ON issue_dependencies(depends_on_id);
CREATE INDEX idx_backlog_sprint ON backlog(assigned_sprint);
CREATE INDEX idx_backlog_status ON backlog(status);
CREATE INDEX idx_tasks_backlog ON tasks(backlog_id);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE TABLE projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  archived    INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
, prefix TEXT, preview_base_url TEXT, repo_path TEXT, docs_path TEXT, context_file_path TEXT, ai_summary TEXT, ai_next_steps TEXT, ai_summary_at DATETIME, sstd_content TEXT, sstd_updated_at DATETIME);
CREATE INDEX idx_sprints_project     ON sprints(project_id);
CREATE INDEX idx_backlog_project     ON backlog(project_id);
CREATE UNIQUE INDEX idx_projects_prefix ON projects(prefix);
CREATE UNIQUE INDEX idx_backlog_project_number
  ON backlog(project_id, project_number);
CREATE TABLE backlog_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backlog_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_backlog_attachments_backlog ON backlog_attachments(backlog_id);
CREATE INDEX idx_backlog_deleted_at ON backlog(deleted_at);
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  is_secret INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'mauve',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name)
);
CREATE INDEX idx_tags_project ON tags(project_id);
CREATE TABLE backlog_tags (
  backlog_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (backlog_id, tag_id)
);
CREATE INDEX idx_backlog_tags_backlog ON backlog_tags(backlog_id);
CREATE INDEX idx_backlog_tags_tag ON backlog_tags(tag_id);
CREATE TABLE milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'open',  -- open | reached | cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, position INTEGER,
  UNIQUE(project_id, name)
);
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_sprints_milestone ON sprints(milestone_id);
CREATE UNIQUE INDEX idx_sprints_project_number ON sprints(project_id, project_number);
CREATE TABLE IF NOT EXISTS "review_feedback" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backlog_id INTEGER NOT NULL REFERENCES backlog(id),
    status TEXT NOT NULL DEFAULT 'pending',
    comment TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    round_number INTEGER NOT NULL DEFAULT 1,
    review_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX idx_review_feedback_backlog ON review_feedback(backlog_id);
CREATE INDEX idx_review_feedback_backlog_round ON review_feedback(backlog_id, round_number);
CREATE INDEX idx_milestones_project_position ON milestones(project_id, position);
CREATE TABLE issue_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_issue_files_issue ON issue_files(issue_id);
CREATE TABLE ai_cost_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  action TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE INDEX idx_ai_cost_events_created ON ai_cost_events (created_at);
CREATE INDEX idx_ai_cost_events_action ON ai_cost_events (action);
CREATE INDEX idx_ai_cost_events_project ON ai_cost_events (project_id);
CREATE TABLE ai_pricing (
  model TEXT PRIMARY KEY,
  input_per_mtok REAL NOT NULL,
  output_per_mtok REAL NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
