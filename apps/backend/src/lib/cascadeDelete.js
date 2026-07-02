// DD2 T02a — kaskadierendes Löschen (Meilenstein → Sprints → Issues + Kinder).
//
// FK-Landschaft (PRAGMA foreign_keys=ON): die meisten Issue-Kinder (tags,
// user_stories, subtasks, attachments, issue_files) tragen ON DELETE CASCADE und
// verschwinden mit der backlog-Zeile automatisch. NICHT kaskadierend sind
// issue_dependencies + review_feedback → explizit zuerst löschen (spiegelt den
// force-Pfad von DELETE /api/backlog/:id). Sprints: sprint_dependencies/sprint_tags
// kaskadieren. backlog.
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

// ── Projekt-Kaskade ───────────────────────────────────────────────────────────
// Ein Projekt-Teardown reißt den kompletten Kind-Graph ab. FK-Landschaft
// (PRAGMA foreign_keys=ON) trägt gemischtes ON DELETE:
//   CASCADE   → tags, milestones, project_todos(+todo_links), user_notes,
//               project_memories, memory_tags, session_notes (fallen mit der
//               projects-Zeile automatisch).
//   SET NULL  → ai_usage.project_id.
//   NO ACTION → sprints, backlog (blocken den DELETE ohne vorheriges explizites
//               Löschen). backlog.assigned_sprint ist KEIN FK → Sprint-Issues
//               müssen über den Sprint gelöscht werden.
// (archon_runs war in 003 ein NO-ACTION-FK, wurde aber in Migration 006 gedroppt
//  — die Tabelle existiert nicht mehr, daher hier bewusst NICHT referenziert.)
// Reihenfolge daher: Sprints (räumt zugewiesene Issues + Kinder) → sprintlose
// backlog-Issues → projects-Zeile. Aufrufer kapselt in db.transaction().

// projectDeletePreview zählt (read-only), was ein Cascade-Delete mitnähme.
export function projectDeletePreview(db, projectId) {
  const c = (sql) => db.prepare(sql).get(projectId).c
  return {
    project_id: projectId,
    sprints: c('SELECT COUNT(*) AS c FROM sprints WHERE project_id = ?'),
    backlog: c('SELECT COUNT(*) AS c FROM backlog WHERE project_id = ?'),
    milestones: c('SELECT COUNT(*) AS c FROM milestones WHERE project_id = ?'),
    tags: c('SELECT COUNT(*) AS c FROM tags WHERE project_id = ?'),
    project_memories: c('SELECT COUNT(*) AS c FROM project_memories WHERE project_id = ?'),
    user_notes: c('SELECT COUNT(*) AS c FROM user_notes WHERE project_id = ?'),
    todos: c('SELECT COUNT(*) AS c FROM project_todos WHERE project_id = ?'),
  }
}

// cascadeDeleteProject reißt Sprints/Issues explizit ab und löscht dann die
// projects-Zeile (die den CASCADE-Rest auto-räumt). NICHT selbst transaktional
// — Aufrufer kapselt in db.transaction() (spiegelt cascadeDeleteSprints).
export function cascadeDeleteProject(db, projectId) {
  // 1. Alle Sprints des Projekts inkl. ihrer zugewiesenen Issues + Kinder.
  const sprintIds = db.prepare('SELECT id FROM sprints WHERE project_id = ?').all(projectId).map(r => r.id)
  cascadeDeleteSprints(db, sprintIds)
  // 2. Verbleibende sprintlose backlog-Issues des Projekts (assigned_sprint IS NULL).
  const looseIssueIds = db.prepare('SELECT id FROM backlog WHERE project_id = ?').all(projectId).map(r => r.id)
  cascadeDeleteIssues(db, looseIssueIds)
  // 3. projects-Zeile → cascadet tags/milestones/todos/user_notes/memories/…; SET NULL ai_usage.
  db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
}
