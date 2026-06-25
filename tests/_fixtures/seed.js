export const TEST_PROJECT_ID = 2

export function seedProject(db, { id = TEST_PROJECT_ID, slug = 'devd', name = 'DevD', prefix = 'DD' } = {}) {
  db.prepare(`
    INSERT OR IGNORE INTO projects (id, slug, name, prefix)
    VALUES (?, ?, ?, ?)
  `).run(id, slug, name, prefix)
  return id
}

export function seedMilestones(db, milestones, { projectId = TEST_PROJECT_ID } = {}) {
  seedProject(db, { id: projectId })
  const ins = db.prepare(`
    INSERT INTO milestones (project_id, name, description, target_date, status, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const ids = []
  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i]
    const result = ins.run(
      projectId,
      m.name,
      m.description ?? null,
      m.target_date ?? null,
      m.status ?? 'open',
      m.position ?? i + 1,
    )
    ids.push(Number(result.lastInsertRowid))
  }
  return ids
}

export function seedDependencies(db, edges) {
  const ins = db.prepare(`
    INSERT INTO milestone_dependencies (predecessor_id, successor_id)
    VALUES (?, ?)
  `)
  for (const [predecessor, successor] of edges) {
    ins.run(predecessor, successor)
  }
}

export function seedDodItems(db, milestoneId, items) {
  const ins = db.prepare(`
    INSERT INTO milestone_dod_items (milestone_id, label, done, position)
    VALUES (?, ?, ?, ?)
  `)
  const ids = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const result = ins.run(milestoneId, it.label, it.done ?? 0, it.position ?? i + 1)
    ids.push(Number(result.lastInsertRowid))
  }
  return ids
}
