-- Down für 043_v3_sstd_slots.sql (MEM-16). Verwirft die Slot-Tabelle vollständig.
-- projects.sstd_content (Migration 026) bleibt unberührt → SSTD weiterhin als Legacy-Blob lesbar.

DROP INDEX IF EXISTS idx_project_sstd_slots_project;
DROP TABLE IF EXISTS project_sstd_slots;
