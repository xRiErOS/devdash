-- DD-169: AI Cost Tracking — pro API-Call Token-Verbrauch + Kosten persistieren.
-- Erlaubt globales Cost-Dashboard (filterbar nach Projekt, Aktion, Zeitraum)
-- sowie ein optionales Kostenlimit (Setting AI_COST_LIMIT_USD).

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

-- Pricing pro Modell: USD pro 1 Mio Tokens (Anthropic-Standardeinheit).
-- Initial-Seed entspricht aktueller Anthropic-Preisliste 2026-Q2.
-- Update-Pfad: UPDATE ai_pricing SET input_per_mtok = ?, output_per_mtok = ?,
-- updated_at = CURRENT_TIMESTAMP WHERE model = ?;
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

-- Globales Kostenlimit als Setting. NULL = kein Limit.
INSERT OR IGNORE INTO settings (key, description, is_secret) VALUES
  ('AI_COST_LIMIT_USD', 'Optionales globales Monatslimit fuer KI-API-Kosten in USD (NULL = unbegrenzt)', 0);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('025_v3_ai_cost_tracking');
