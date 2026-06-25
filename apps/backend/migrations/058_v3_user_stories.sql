-- 058_v3_user_stories.sql - E01.2 (GF-2 Backend-Epic) user_stories entity
-- Per-issue User Stories = die Pruefgrundlage je Issue (loest issue-level
-- acceptance_criteria + test_instruction ab, D09). Story-scoped Verdict-Badge
-- us_verdict {open,accepted,rejected} (Backend-B02: NICHT `verdict` — Kollisions-
-- Schutz ggue Issue-review_status). Parent issue owns the sprint slot (cascade).
-- Mirrors migration 035 (subtasks).

CREATE TABLE user_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backlog_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  qa TEXT,
  us_verdict TEXT NOT NULL DEFAULT 'open' CHECK(us_verdict IN ('open','accepted','rejected')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_stories_backlog ON user_stories(backlog_id);
