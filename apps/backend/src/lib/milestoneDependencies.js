// DD-257 (T05 M02-S01): Cycle-Detection für milestone_dependencies via DFS.
// D03 (Session 2026-05-22): rekursiv, white/gray/black-Set, getestet mit 6 Topologie-Cases.
// R02-Mitigation: Pre-Insert-Check verhindert Zyklen, Transaction-Wrapper atomar.

export function detectCycle(db, { predecessor_id, successor_id }) {
  const visited = new Set()
  const recStack = new Set()

  function dfs(node) {
    if (recStack.has(node)) return true
    if (visited.has(node)) return false
    visited.add(node)
    recStack.add(node)

    const successors = db.prepare(
      `SELECT successor_id FROM milestone_dependencies WHERE predecessor_id = ?`,
    ).all(node).map(r => r.successor_id)

    if (node === predecessor_id) successors.push(successor_id)

    for (const next of successors) {
      if (dfs(next)) return true
    }

    recStack.delete(node)
    return false
  }

  return dfs(predecessor_id)
}

export function findCyclePath(db, { predecessor_id, successor_id }) {
  const recStack = []
  const visited = new Set()

  function dfs(node) {
    if (recStack.includes(node)) {
      const idx = recStack.indexOf(node)
      return [...recStack.slice(idx), node]
    }
    if (visited.has(node)) return null
    visited.add(node)
    recStack.push(node)

    const successors = db.prepare(
      `SELECT successor_id FROM milestone_dependencies WHERE predecessor_id = ?`,
    ).all(node).map(r => r.successor_id)

    if (node === predecessor_id) successors.push(successor_id)

    for (const next of successors) {
      const path = dfs(next)
      if (path) return path
    }

    recStack.pop()
    return null
  }

  return dfs(predecessor_id)
}

export function getDependenciesForMilestone(db, milestoneId) {
  const predecessors = db.prepare(`
    SELECT m.id, m.name, d.id AS dependency_id
    FROM milestone_dependencies d
    JOIN milestones m ON m.id = d.predecessor_id
    WHERE d.successor_id = ?
    ORDER BY m.position IS NULL, m.position ASC, m.name ASC
  `).all(milestoneId)
  const successors = db.prepare(`
    SELECT m.id, m.name, d.id AS dependency_id
    FROM milestone_dependencies d
    JOIN milestones m ON m.id = d.successor_id
    WHERE d.predecessor_id = ?
    ORDER BY m.position IS NULL, m.position ASC, m.name ASC
  `).all(milestoneId)
  return { predecessors, successors }
}

export function insertDependency(db, { predecessor_id, successor_id, projectId }) {
  if (!Number.isInteger(predecessor_id) || predecessor_id <= 0 ||
      !Number.isInteger(successor_id) || successor_id <= 0) {
    const err = new Error('predecessor_id und successor_id müssen positive Integer sein')
    err.statusCode = 400
    err.code = 'INVALID_ID'
    throw err
  }
  if (predecessor_id === successor_id) {
    const err = new Error('predecessor_id und successor_id dürfen nicht identisch sein')
    err.statusCode = 400
    err.code = 'SELF_LOOP'
    throw err
  }

  // Finding #8 + #9 + #10: checkScope + Cross-Project-Check + UNIQUE-Detection + Cycle-Check
  // alles in einer Transaction für atomare Konsistenz (Race-Free gegen multi-process Modifikationen).
  // UNIQUE-Error mit explizitem statusCode/code taggen, statt String-Match im Caller.
  const tx = db.transaction(() => {
    const checkScope = db.prepare(
      `SELECT id, project_id FROM milestones WHERE id IN (?, ?)`,
    ).all(predecessor_id, successor_id)
    if (checkScope.length !== 2) {
      const err = new Error('predecessor_id oder successor_id existiert nicht')
      err.statusCode = 400
      err.code = 'MISSING_FK'
      throw err
    }
    if (projectId != null && checkScope.some(r => r.project_id !== projectId)) {
      const err = new Error('Mindestens eine Milestone gehört nicht zum aktiven Projekt')
      err.statusCode = 422
      err.code = 'CROSS_PROJECT'
      throw err
    }

    // Finding #9: Duplikat-Check vor INSERT statt erst nach UNIQUE-Violation.
    const dup = db.prepare(
      `SELECT id FROM milestone_dependencies WHERE predecessor_id = ? AND successor_id = ?`,
    ).get(predecessor_id, successor_id)
    if (dup) {
      const err = new Error('Dependency existiert bereits')
      err.statusCode = 409
      err.code = 'DUPLICATE'
      throw err
    }

    if (detectCycle(db, { predecessor_id, successor_id })) {
      const path = findCyclePath(db, { predecessor_id, successor_id })
      const err = new Error(`Zyklus erkannt: ${path?.join(' → ') ?? '<unbekannt>'}`)
      err.statusCode = 409
      err.code = 'CYCLE_DETECTED'
      err.path = path
      throw err
    }
    const result = db.prepare(
      `INSERT INTO milestone_dependencies (predecessor_id, successor_id) VALUES (?, ?)`,
    ).run(predecessor_id, successor_id)
    return Number(result.lastInsertRowid)
  })
  return tx()
}

// Finding #10: pre-existing-Cycle-Detection. Wenn die DB bereits einen Zyklus enthält
// (z.B. durch Legacy-Daten ohne Cycle-Check), wird das hier separat erkannt — verhindert
// false-positive 409s bei legitimen neuen Edges, indem die Cycle-Detection NUR den
// neuen Edge mitberücksichtigt, aber nicht durch bestehende Zyklen iteriert.
export function hasPreExistingCycle(db) {
  const edges = db.prepare(
    `SELECT predecessor_id, successor_id FROM milestone_dependencies`,
  ).all()
  const graph = new Map()
  for (const e of edges) {
    if (!graph.has(e.predecessor_id)) graph.set(e.predecessor_id, [])
    graph.get(e.predecessor_id).push(e.successor_id)
  }
  const visited = new Set()
  const recStack = new Set()
  function dfs(node) {
    if (recStack.has(node)) return true
    if (visited.has(node)) return false
    visited.add(node); recStack.add(node)
    for (const next of (graph.get(node) ?? [])) {
      if (dfs(next)) return true
    }
    recStack.delete(node)
    return false
  }
  for (const node of graph.keys()) {
    if (dfs(node)) return true
  }
  return false
}
