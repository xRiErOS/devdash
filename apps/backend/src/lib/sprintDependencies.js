// GF-2 Wave D / D2 (T01): Cycle-Detection für sprint_dependencies via DFS.
// 1:1-Mirror von server/lib/milestoneDependencies.js (DD-257) — Graph zwischen Sprints.
// rekursiv, visited/recStack-Set; Pre-Insert-Check verhindert Zyklen, Transaction atomar.
// Scope via sprints.project_id (keine eigene project_id-Spalte). lifecycle.js UNBERÜHRT
// (Graph ≠ Status — kein Import von lifecycle).

export function detectCycle(db, { predecessor_id, successor_id }) {
  const visited = new Set()
  const recStack = new Set()

  function dfs(node) {
    if (recStack.has(node)) return true
    if (visited.has(node)) return false
    visited.add(node)
    recStack.add(node)

    const successors = db.prepare(
      `SELECT successor_id FROM sprint_dependencies WHERE predecessor_id = ?`,
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
      `SELECT successor_id FROM sprint_dependencies WHERE predecessor_id = ?`,
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

export function getDependenciesForSprint(db, sprintId) {
  const predecessors = db.prepare(`
    SELECT s.id, s.name, d.id AS dependency_id
    FROM sprint_dependencies d
    JOIN sprints s ON s.id = d.predecessor_id
    WHERE d.successor_id = ?
    ORDER BY s.position IS NULL, s.position ASC, s.name ASC
  `).all(sprintId)
  const successors = db.prepare(`
    SELECT s.id, s.name, d.id AS dependency_id
    FROM sprint_dependencies d
    JOIN sprints s ON s.id = d.successor_id
    WHERE d.predecessor_id = ?
    ORDER BY s.position IS NULL, s.position ASC, s.name ASC
  `).all(sprintId)
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

  // checkScope + Cross-Project + Duplikat + Cycle-Check atomar in einer Transaction.
  const tx = db.transaction(() => {
    const checkScope = db.prepare(
      `SELECT id, project_id FROM sprints WHERE id IN (?, ?)`,
    ).all(predecessor_id, successor_id)
    if (checkScope.length !== 2) {
      const err = new Error('predecessor_id oder successor_id existiert nicht')
      err.statusCode = 400
      err.code = 'MISSING_FK'
      throw err
    }
    if (projectId != null && checkScope.some(r => r.project_id !== projectId)) {
      const err = new Error('Mindestens ein Sprint gehört nicht zum aktiven Projekt')
      err.statusCode = 422
      err.code = 'CROSS_PROJECT'
      throw err
    }

    const dup = db.prepare(
      `SELECT id FROM sprint_dependencies WHERE predecessor_id = ? AND successor_id = ?`,
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
      `INSERT INTO sprint_dependencies (predecessor_id, successor_id) VALUES (?, ?)`,
    ).run(predecessor_id, successor_id)
    return Number(result.lastInsertRowid)
  })
  return tx()
}

export function hasPreExistingCycle(db) {
  const edges = db.prepare(
    `SELECT predecessor_id, successor_id FROM sprint_dependencies`,
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
