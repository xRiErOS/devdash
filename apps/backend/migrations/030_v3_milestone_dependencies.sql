-- DD-254 (T02 in M02-S01): milestone_dependencies — gerichteter Graph für Roadmap-Topologie.
-- Voraussetzung für M3 Project Home Tab (Topologie-Visualisierung).
-- UNIQUE verhindert Duplikate, CHECK verhindert Self-Loop (Multi-Hop-Zyklen → T05 DFS).
-- FK CASCADE: löschen eines Milestones entfernt seine Dependency-Edges automatisch.

CREATE TABLE milestone_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  predecessor_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  successor_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(predecessor_id, successor_id),
  CHECK(predecessor_id != successor_id)
);

CREATE INDEX idx_milestone_deps_predecessor ON milestone_dependencies(predecessor_id);
CREATE INDEX idx_milestone_deps_successor ON milestone_dependencies(successor_id);
