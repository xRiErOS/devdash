-- MEM-16 (MEM#6): SSTD-Slot-Architektur — SSTD vom TEXT-Blob (projects.sstd_content, Migration 026)
-- auf 6 adressierbare Prosa-Slots auftrennen. Ermöglicht gezielte Per-Slot/Per-Line-Updates
-- statt Whole-Doc-Rewrite (Token-Ersparnis beim Generieren UND Lesen). Decision-Log MEM#6: D01
-- (eigene Tabelle), D02-rev3 (6 fixe Slots), D05 (leer starten, Befüllung via Vault-Prompt MEM-19).
--
-- Slots werden NICHT vorab geseedet: getSlot/listSlots liefern lazy einen leeren Slot ('' ),
-- wenn keine Row existiert — einheitlich für bestehende UND neue Projekte (kein Backfill nötig,
-- neue Projekte automatisch abgedeckt). projects.sstd_content bleibt Legacy-Fallback in
-- renderReadAll, bis die Slots befüllt sind.
-- Migration-Nummer 043 (vorgängig: 042_v3_project_memory_anchor_stability.sql).

CREATE TABLE project_sstd_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL CHECK (slot_key IN (
    'architecture', 'conventions', 'sprint_state', 'roadmap', 'cross_refs', 'misc'
  )),
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (project_id, slot_key)
);

CREATE INDEX idx_project_sstd_slots_project ON project_sstd_slots(project_id);
