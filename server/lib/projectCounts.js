// ProjectPages T-be3 (Review Backend-I05): Project-Counts-Aggregat.
// Single-Source der Count-Subqueries für GET /api/projects und /api/projects/:id,
// damit Route + Tests dieselbe Logik teilen (kein Query-Reproduktions-Drift, vgl. DD-390).
//
// Liefert je Projekt: bestehende sprint_count + backlog_count (Issues) sowie additiv
// milestone_count, memory_count (project_memories) und active_sprint ({id,name}|null).

const COUNTS_SELECT = `
  SELECT p.*,
    (SELECT COUNT(*) FROM sprints s WHERE s.project_id = p.id) AS sprint_count,
    (SELECT COUNT(*) FROM backlog b WHERE b.project_id = p.id) AS backlog_count,
    (SELECT COUNT(*) FROM milestones m WHERE m.project_id = p.id) AS milestone_count,
    (SELECT COUNT(*) FROM project_memories pm WHERE pm.project_id = p.id) AS memory_count
  FROM projects p
`

// Aktiver Sprint je Projekt: erster mit status='active' (id-stabil). null wenn keiner.
function activeSprintFor(db, projectId) {
  const s = db.prepare(
    "SELECT id, name FROM sprints WHERE project_id = ? AND status = 'active' ORDER BY id LIMIT 1",
  ).get(projectId)
  return s ? { id: Number(s.id), name: s.name } : null
}

// Einzelnes Projekt (id) mit Counts + active_sprint; null wenn nicht gefunden.
export function getProjectWithCounts(db, projectId) {
  const row = db.prepare(`${COUNTS_SELECT} WHERE p.id = ?`).get(projectId)
  if (!row) return null
  row.active_sprint = activeSprintFor(db, row.id)
  return row
}

// Alle Projekte mit Counts + active_sprint. Standardmäßig ohne archivierte (Route-Verhalten).
export function listProjectsWithCounts(db, { includeArchived = false } = {}) {
  const where = includeArchived ? '' : 'WHERE p.archived = 0'
  const rows = db.prepare(`${COUNTS_SELECT} ${where} ORDER BY p.id`).all()
  for (const row of rows) row.active_sprint = activeSprintFor(db, row.id)
  return rows
}
