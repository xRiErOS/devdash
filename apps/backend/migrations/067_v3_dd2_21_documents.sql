-- DD2-21 (DD2#22): Dokumenten-Subsystem für Meilensteine/Sprints.
-- Markdown-Dokumente, einem Meilenstein ODER einem Sprint zugeordnet (genau ein Owner).
-- Storage-Entscheidung D02 (PO 2026-06-29): DB-Blob — der Markdown-Body liegt direkt in
-- der Spalte body (kein Filesystem-Sync, atomar mit dem DB-Backup). file_path bleibt als
-- optionaler Hinweis (z.B. repo-relativer Ursprung), ist aber NICHT die Quelle.
--
-- ON DELETE CASCADE auf beiden FKs: Löscht man einen Meilenstein/Sprint (cascadeDelete.js,
-- foreign_keys=ON), verschwinden die zugeordneten Dokumente automatisch — kein manueller
-- Cleanup nötig (anders als archon_runs, das keinen Cascade-FK trägt).

CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
  sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  file_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Genau ein Owner: entweder Meilenstein oder Sprint, nie beides/keins.
  CHECK ((milestone_id IS NOT NULL) + (sprint_id IS NOT NULL) = 1)
);

CREATE INDEX idx_documents_milestone ON documents(milestone_id);
CREATE INDEX idx_documents_sprint ON documents(sprint_id);
