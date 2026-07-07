import { listDocuments } from './documents.js'
import { listMemories } from './projectMemories.js'

const OPEN_STATUS_FILTER = "status NOT IN ('completed', 'cancelled')"

function activeDocTitles(db, owner) {
  return listDocuments(db, owner).filter(d => d.status !== 'archived').map(d => d.title)
}

function mapSprintRow(db, row) {
  return {
    id: row.id,
    key: `${row.project_prefix}#${row.project_number}`,
    name: row.name,
    status: row.status,
    docs: activeDocTitles(db, { type: 'sprint', id: row.id }),
  }
}

function fetchOpenSprints(db, projectId) {
  return db.prepare(`
    SELECT s.id, s.name, s.status, s.milestone_id, s.project_number, p.prefix AS project_prefix
    FROM sprints s
    JOIN projects p ON p.id = s.project_id
    WHERE s.project_id = ? AND s.${OPEN_STATUS_FILTER}
    ORDER BY s.position, s.id
  `).all(projectId)
}

function openMilestoneEdges(db, projectId, openIds) {
  if (openIds.length === 0) return []
  const placeholders = openIds.map(() => '?').join(',')
  return db.prepare(`
    SELECT md.predecessor_id, md.successor_id
    FROM milestone_dependencies md
    JOIN milestones m ON m.id = md.successor_id
    WHERE m.project_id = ? AND md.successor_id IN (${placeholders}) AND md.predecessor_id IN (${placeholders})
  `).all(projectId, ...openIds, ...openIds)
    .map(e => `${e.predecessor_id} --> ${e.successor_id}`)
}

function openSprintEdges(db, projectId, keyById) {
  const openIds = [...keyById.keys()]
  if (openIds.length === 0) return []
  const placeholders = openIds.map(() => '?').join(',')
  return db.prepare(`
    SELECT sd.predecessor_id, sd.successor_id
    FROM sprint_dependencies sd
    JOIN sprints s ON s.id = sd.successor_id
    WHERE s.project_id = ? AND sd.successor_id IN (${placeholders}) AND sd.predecessor_id IN (${placeholders})
  `).all(projectId, ...openIds, ...openIds)
    .map(e => `${keyById.get(e.predecessor_id)} --> ${keyById.get(e.successor_id)}`)
}

function backlogByPriority(db, projectId) {
  const rows = db.prepare(`
    SELECT priority, COUNT(*) AS n
    FROM backlog
    WHERE project_id = ? AND (status = 'new' OR (status = 'planned' AND assigned_sprint IS NULL))
    GROUP BY priority
  `).all(projectId)
  const by_priority = {}
  let total = 0
  for (const row of rows) {
    by_priority[row.priority] = row.n
    total += row.n
  }
  return { by_priority, total }
}

function compactMemory(row) {
  const { content, ...rest } = row
  return rest
}

function sortedByCreatedAtDesc(rows) {
  return rows.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
}

function recentByCategory(db, projectId, category, limit) {
  return sortedByCreatedAtDesc(listMemories(db, projectId, { category })).slice(0, limit).map(compactMemory)
}

function pinnedByCategory(db, projectId, category) {
  return sortedByCreatedAtDesc(listMemories(db, projectId, { category }).filter(r => r.pinned === 1)).map(compactMemory)
}

export function getProjectStatus(db, projectId) {
  const milestoneRows = db.prepare(`
    SELECT id, name, status FROM milestones
    WHERE project_id = ? AND ${OPEN_STATUS_FILTER}
    ORDER BY position, id
  `).all(projectId)

  const openSprints = fetchOpenSprints(db, projectId)
  const sprintsByMilestone = new Map()
  const orphanSprints = []
  const sprintKeyById = new Map()
  for (const row of openSprints) {
    sprintKeyById.set(row.id, `${row.project_prefix}#${row.project_number}`)
    const mapped = mapSprintRow(db, row)
    if (row.milestone_id == null) {
      orphanSprints.push(mapped)
    } else {
      if (!sprintsByMilestone.has(row.milestone_id)) sprintsByMilestone.set(row.milestone_id, [])
      sprintsByMilestone.get(row.milestone_id).push(mapped)
    }
  }

  const milestones = milestoneRows.map(m => ({
    id: m.id,
    name: m.name,
    status: m.status,
    docs: activeDocTitles(db, { type: 'milestone', id: m.id }),
    sprints: sprintsByMilestone.get(m.id) ?? [],
  }))

  return {
    milestones,
    orphan_sprints: orphanSprints,
    dependency_graph: {
      milestones: openMilestoneEdges(db, projectId, milestoneRows.map(m => m.id)),
      sprints: openSprintEdges(db, projectId, sprintKeyById),
    },
    backlog: backlogByPriority(db, projectId),
    session_log_recent: recentByCategory(db, projectId, 'session_log', 5),
    decisions_recent: recentByCategory(db, projectId, 'architecture_decision', 5),
    decisions_pinned: pinnedByCategory(db, projectId, 'architecture_decision'),
  }
}
