// MEM-14 (MEM#5): issue_dependencies Helper — shared zwischen REST-Routen
// (GET/POST /api/backlog/:id/dependencies) und additiver Anzeige in issue_show + sprint_show.
// Pure Funktionen ohne Express-Abhängigkeit. Tabelle issue_dependencies (id, issue_id,
// depends_on_id, note) liegt im Baseline-Schema. Edge-Semantik: issue_id depends_on depends_on_id
// (depends_on_id muss zuerst fertig sein → blockt issue_id).

const DEP_SELECT = `
  SELECT d.id AS dep_id, d.note, b.id, b.title, b.status, b.type, b.priority
`

// blockers = worauf dieses Issue wartet (depends_on); blocked_by = was auf dieses Issue wartet.
export function listIssueDependencies(db, issueId) {
  const blockers = db.prepare(`
    ${DEP_SELECT}
    FROM issue_dependencies d
    JOIN backlog b ON b.id = d.depends_on_id
    WHERE d.issue_id = ?
  `).all(issueId)
  const blocked_by = db.prepare(`
    ${DEP_SELECT}
    FROM issue_dependencies d
    JOIN backlog b ON b.id = d.issue_id
    WHERE d.depends_on_id = ?
  `).all(issueId)
  return { blockers, blocked_by }
}

// Leichtgewichtige Zähler für Listenansichten (sprint_show), ohne JOIN-Payload.
export function countIssueDependencies(db, issueId) {
  const blockers = db.prepare('SELECT COUNT(*) AS n FROM issue_dependencies WHERE issue_id = ?').get(issueId).n
  const blocked_by = db.prepare('SELECT COUNT(*) AS n FROM issue_dependencies WHERE depends_on_id = ?').get(issueId).n
  return { blockers, blocked_by }
}

// Exakte Kante issue_id → depends_on_id (für gezieltes Entfernen via dep-id).
export function findDependencyEdge(db, issueId, dependsOnId) {
  return db.prepare(
    'SELECT id FROM issue_dependencies WHERE issue_id = ? AND depends_on_id = ?'
  ).get(issueId, dependsOnId) || null
}
