-- GF-2 Wave D / D2 (T01): sprint_dependencies — gerichteter Graph zwischen Sprints.
-- 1:1-Mirror von milestone_dependencies (Migration 030). Eliminiert die textliche
-- Deps-Drift im Sprint-Detail (D-E). UNIQUE verhindert Duplikate, CHECK verhindert
-- Self-Loop (Multi-Hop-Zyklen → DFS in server/lib/sprintDependencies.js). FK CASCADE:
-- Sprint löschen entfernt seine Dependency-Edges automatisch. KEINE project_id-Spalte —
-- Scope via Parent-JOIN auf sprints.project_id (wie milestone_dependencies).

CREATE TABLE sprint_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  predecessor_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  successor_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(predecessor_id, successor_id),
  CHECK(predecessor_id != successor_id)
);

CREATE INDEX idx_sprint_deps_predecessor ON sprint_dependencies(predecessor_id);
CREATE INDEX idx_sprint_deps_successor ON sprint_dependencies(successor_id);
