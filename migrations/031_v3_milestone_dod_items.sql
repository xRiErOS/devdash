-- DD-255 (T03 in M02-S01): milestone_dod_items — manuelle Definition-of-Done-Checkliste pro Milestone.
-- Master-SSTD D08: DoD-Items entkoppelt von Issue-Status (kein Auto-Sync).
-- D04 (Session 2026-05-22): position via API-Layer (MAX+1 atomar in T06), Schema-Ebene NOT NULL.
-- done als INTEGER (SQLite-Konvention), CHECK(done IN (0,1)).

CREATE TABLE milestone_dod_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0, 1)),
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dod_items_milestone ON milestone_dod_items(milestone_id, position);
