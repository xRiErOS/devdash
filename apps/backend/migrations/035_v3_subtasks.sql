-- 035_v3_subtasks.sql - DD-312 Subtasks entity
-- Adds in-sprint child tasks for backlog issues. Parent issue owns sprint slot.
-- Lifecycle is constrained to open -> done at the schema level; the API adds
-- the QA guard before status can move to done.

CREATE TABLE subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backlog_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  qa_criteria TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE INDEX idx_subtasks_backlog ON subtasks(backlog_id);
