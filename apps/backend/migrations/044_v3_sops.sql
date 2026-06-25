-- MEM-23 (MEM#8): SOP-Entität — SOPs als erstklassige DevDashboard-Entität in der DB (global).
-- DD-214 las SOPs vom Dateisystem (readFileSync aus Mac-Vault-Pfad) und NUR in der CLI → der
-- mandatierte MCP-Pfad war SOP-blind, remote/NAS-Agenten bekamen "SOP nicht gefunden".
-- Decisions MEM#8: SOP-D01 DB-Master (wie SSTD/DD-213), SOP-D02 NUR global (KEIN project_id,
-- Projekt-Spezifika via CLAUDE.md), SOP-D03 Trigger-Map in der DB (Lifecycle-Aktion → SOP).
-- Migration-Nummer 044 (vorgängig: 043_v3_sstd_slots.sql).

CREATE TABLE sops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  source_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger-Map (SOP-D03): Lifecycle-Aktion (z.B. 'sprint:start') → eine oder mehrere SOPs,
-- geordnet via position. Join-Tabelle statt Komma-Liste → referentielle Integrität + ON DELETE CASCADE.
CREATE TABLE sop_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_key TEXT NOT NULL,
  sop_id INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (trigger_key, sop_id)
);

CREATE INDEX idx_sop_triggers_key ON sop_triggers(trigger_key);
