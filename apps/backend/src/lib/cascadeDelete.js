// DD2 T02a — kaskadierendes Löschen (Meilenstein → Sprints → Issues + Kinder).
//
// FK-Landschaft (PRAGMA foreign_keys=ON): die meisten Issue-Kinder (tags,
// user_stories, subtasks, attachments, issue_files) tragen ON DELETE CASCADE und
// verschwinden mit der backlog-Zeile automatisch. NICHT kaskadierend sind
// issue_dependencies + review_feedback → explizit zuerst löschen (spiegelt den
// force-Pfad von DELETE /api/backlog/:id). Sprints: sprint_dependencies/sprint_tags
// kaskadieren. (DD2-156: archon_runs wurde in Migration 006 dauerhaft gedroppt
// (Archon deferred) — keine Referenz mehr im Cascade-Pfad, sonst „no such table:
// archon_runs" beim Projekt-Browser-Delete.) backlog.assigned_sprint ist KEIN FK
// → Issues müssen explizit über den Sprint gelöscht werden. Aufrufer kapselt die
// Calls in db.transaction().
//
// db wird injiziert, damit die Logik gegen eine Test-DB (createTestDb) läuft.

export function cascadeDeleteIssues(db, issueIds) {
  for (const iid of issueIds) {
    db.prepare('DELETE FROM issue_dependencies WHERE issue_id = ? OR depends_on_id = ?').run(iid, iid)
    db.prepare('DELETE FROM review_feedback WHERE backlog_id = ?').run(iid)
    db.prepare('DELETE FROM backlog WHERE id = ?').run(iid)
  }
}

export function cascadeDeleteSprints(db, sprintIds) {
  for (const sid of sprintIds) {
    const issueIds = db.prepare('SELECT id FROM backlog WHERE assigned_sprint = ?').all(sid).map(r => r.id)
    cascadeDeleteIssues(db, issueIds)
    db.prepare('DELETE FROM sprints WHERE id = ?').run(sid)
  }
}

// milestoneDeletePreview zählt (read-only), was ein Cascade-Delete mitnähme.
// DD2-21: documents = eigene Meilenstein-Dokumente + Dokumente aller seiner Sprints
// (beide verschwinden via ON DELETE CASCADE, sobald Meilenstein/Sprint gelöscht werden).
export function milestoneDeletePreview(db, id) {
  const sprintIds = db.prepare('SELECT id FROM sprints WHERE milestone_id = ?').all(id).map(s => s.id)
  let issues = 0
  for (const sid of sprintIds) {
    issues += db.prepare('SELECT COUNT(*) AS c FROM backlog WHERE assigned_sprint = ?').get(sid).c
  }
  let documents = db.prepare('SELECT COUNT(*) AS c FROM documents WHERE milestone_id = ?').get(id).c
  for (const sid of sprintIds) {
    documents += db.prepare('SELECT COUNT(*) AS c FROM documents WHERE sprint_id = ?').get(sid).c
  }
  return { sprints: sprintIds.length, issues, documents, sprintIds }
}

// DD2-21: Anzahl Dokumente eines Sprints (für den Sprint-Delete-Preview).
export function sprintDocumentCount(db, sprintId) {
  return db.prepare('SELECT COUNT(*) AS c FROM documents WHERE sprint_id = ?').get(sprintId).c
}
