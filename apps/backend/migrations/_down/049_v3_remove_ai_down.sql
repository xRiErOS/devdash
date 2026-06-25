-- DD-522 (reverse): KI/AI-Features wiederherstellen.
-- Re-add der 3 projects-Spalten (024), ai_cost_events + ai_pricing (025)
-- sowie der zwei Settings-Keys (009 ANTHROPIC_API_KEY / 025 AI_COST_LIMIT_USD).

-- 024_v3_project_ai_summary
ALTER TABLE projects ADD COLUMN ai_summary TEXT;
ALTER TABLE projects ADD COLUMN ai_next_steps TEXT;
ALTER TABLE projects ADD COLUMN ai_summary_at DATETIME;

-- 025_v3_ai_cost_tracking
CREATE TABLE IF NOT EXISTS ai_cost_events (
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

CREATE INDEX IF NOT EXISTS idx_ai_cost_events_created ON ai_cost_events (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_action ON ai_cost_events (action);
CREATE INDEX IF NOT EXISTS idx_ai_cost_events_project ON ai_cost_events (project_id);

CREATE TABLE IF NOT EXISTS ai_pricing (
  model TEXT PRIMARY KEY,
  input_per_mtok REAL NOT NULL,
  output_per_mtok REAL NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO ai_pricing (model, input_per_mtok, output_per_mtok) VALUES
  ('claude-opus-4-7',     15.0, 75.0),
  ('claude-sonnet-4-6',    3.0, 15.0),
  ('claude-haiku-4-5',     0.8,  4.0),
  ('claude-3-5-sonnet-latest', 3.0, 15.0),
  ('claude-3-5-haiku-latest',  0.8,  4.0);

-- 009_v3_settings + 025_v3_ai_cost_tracking settings-Keys
INSERT OR IGNORE INTO settings (key, description, is_secret) VALUES
  ('ANTHROPIC_API_KEY', 'API-Key fuer Anthropic Claude (Sprint-Planung, Refinement)', 1),
  ('AI_COST_LIMIT_USD', 'Optionales globales Monatslimit fuer KI-API-Kosten in USD (NULL = unbegrenzt)', 0);
