-- MEM-11 (MEM#5): SSTD-Granularität — addressierbare Rows (anchor) + Stabilitäts-Flag.
-- anchor = stabiler Bezeichner (z.B. D-Code "D01") → Section-Patch per Anchor statt Full-Rewrite.
-- stability (stable|volatile) → Snapshot-Rendering kann Cache-Split erzeugen: stabiler Prefix
-- (Projekt-Regeln, Cache warm) + volatiles Segment (Task-Kontext), SSTD I03 / MEM-13.
-- Migration-Nummer 042 (vorgängig: 041_v3_project_memories.sql). SSTD MEM §4 D06.

ALTER TABLE project_memories ADD COLUMN anchor TEXT;
ALTER TABLE project_memories ADD COLUMN stability TEXT NOT NULL DEFAULT 'volatile'
  CHECK (stability IN ('stable', 'volatile'));

-- Ein aktiver Anchor pro Projekt (gelöschte/superseded Rows dürfen denselben Anchor erneut tragen).
CREATE UNIQUE INDEX idx_project_memories_anchor_active
  ON project_memories(project_id, anchor)
  WHERE anchor IS NOT NULL AND deleted_at IS NULL AND superseded_by IS NULL;
