// DD2 T02a — kaskadierendes Löschen (Meilenstein → Sprints → Issues + Kinder).
//
// FK-Landschaft (PRAGMA foreign_keys=ON): die meisten Issue-Kinder (tags,
// user_stories, subtasks, attachments, issue_files) tragen ON DELETE CASCADE und
// verschwinden mit der backlog-Zeile automatisch. NICHT kaskadierend sind
// issue_dependencies + review_feedback → explizit zuerst löschen (spiegelt den
// force-Pfad von DELETE /api/backlog/:id). Sprints: archon_runs hat keinen
// Cascade-FK (manuell), sprint_dependencies/sprint_tags kaskadieren. backlog.
// assigned_sprint ist KEIN FK → Issues müssen explizit über den Sprint gelöscht
// werden. Aufrufer kapselt die Calls in db.transaction().
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
    db.prepare('DELETE FROM archon_runs WHERE sprint_id = ?').run(sid)
    db.prepare('DELETE FROM sprints WHERE id = ?').run(sid)
  }
}

// milestoneDeletePreview zählt (read-only), was ein Cascade-Delete mitnähme.
// documents=0 bis das Dokumenten-Subsystem (DD2-21) existiert (T02c).
export function milestoneDeletePreview(db, id) {
  const sprintIds = db.prepare('SELECT id FROM sprints WHERE milestone_id = ?').all(id).map(s => s.id)
  let issues = 0
  for (const sid of sprintIds) {
    issues += db.prepare('SELECT COUNT(*) AS c FROM backlog WHERE assigned_sprint = ?').get(sid).c
  }
  return { sprints: sprintIds.length, issues, documents: 0, sprintIds }
}
