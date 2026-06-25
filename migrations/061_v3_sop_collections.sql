-- ProjectPages T-be2 (D-E): SOP-Collections — benannte Gruppen von SOPs (Mig 044) + geordnete
-- Mitgliedschaft. Speist SopCollectionsView (S3). Global wie sops (KEIN project_id, SOP-D02).
-- Additiv (CREATE only, kein DROP) → niedriges Deploy-Risiko. NAS-Re-Pull via Portainer (PO).
-- Migration 060 ist durch parallele WIP (verdict-status-sync) belegt → diese Migration = 061.

CREATE TABLE sop_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Junction: Collection → SOPs, geordnet via position. ON DELETE CASCADE auf beiden Seiten
-- (Collection gelöscht → Mitgliedschaften weg; SOP gelöscht → aus allen Collections raus).
CREATE TABLE sop_collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES sop_collections(id) ON DELETE CASCADE,
  sop_id INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (collection_id, sop_id)
);

CREATE INDEX idx_sop_collection_items_collection ON sop_collection_items(collection_id);
