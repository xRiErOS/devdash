// DD2-143 — Backend: GET /api/milestones embedded die Tags je Milestone
// (mirror tagsForBacklog, kein N+1). Testet die Batch-Query tagsForMilestones
// direkt gegen eine Test-DB (analog DD-290: SQL ohne vollen Express-Boot).

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'

// Spiegelt server/api.js tagsForMilestones(ids): map milestone_id → [{id,name,color}].
function tagsForMilestones(db, ids) {
  if (!ids.length) return new Map()
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT mt.milestone_id, t.id, t.name, t.color
    FROM milestone_tags mt
    JOIN tags t ON t.id = mt.tag_id
    WHERE mt.milestone_id IN (${placeholders})
    ORDER BY t.name
  `).all(...ids)
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.milestone_id)) map.set(r.milestone_id, [])
    map.get(r.milestone_id).push({ id: r.id, name: r.name, color: r.color })
  }
  return map
}

describe('DD2-143 — Tag-Embedding für /api/milestones', () => {
  let db, projectId, mWithTags, mNoTags

  beforeAll(() => {
    // milestone_tags entsteht in Migration 055 (> Snapshot 028) → upToVersion setzen.
    db = createTestDb({ upToVersion: '055_v3_sprint_milestone_tags.sql' })
    const proj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd-test', 'DD-Test', 'DD')").run()
    projectId = proj.lastInsertRowid
    const insMs = db.prepare("INSERT INTO milestones (project_id, name, target_date, status, position) VALUES (?, ?, '2026-12-31', 'planning', ?)")
    mWithTags = insMs.run(projectId, 'M-Tagged', 1).lastInsertRowid
    mNoTags = insMs.run(projectId, 'M-Bare', 2).lastInsertRowid

    const insTag = db.prepare("INSERT INTO tags (project_id, name, color) VALUES (?, ?, ?)")
    const tBackend = insTag.run(projectId, 'backend', 'blue').lastInsertRowid
    const tAlpha = insTag.run(projectId, 'alpha', 'green').lastInsertRowid
    const link = db.prepare("INSERT INTO milestone_tags (milestone_id, tag_id) VALUES (?, ?)")
    link.run(mWithTags, tBackend)
    link.run(mWithTags, tAlpha)
  })

  afterAll(() => { db.close() })

  test('Batch-Query liefert Tags des getaggten Milestones (alphabetisch)', () => {
    const map = tagsForMilestones(db, [mWithTags, mNoTags])
    const tags = map.get(mWithTags)
    expect(tags).toHaveLength(2)
    expect(tags.map(t => t.name)).toEqual(['alpha', 'backend']) // ORDER BY t.name
    expect(tags[0]).toMatchObject({ name: 'alpha', color: 'green' })
  })

  test('Milestone ohne Tags fehlt in der Map → Bucket bekommt []', () => {
    const map = tagsForMilestones(db, [mWithTags, mNoTags])
    expect(map.has(mNoTags)).toBe(false)
    // newBucket: map.get(id) || []  → leeres Array
    expect(map.get(mNoTags) || []).toEqual([])
  })

  test('Leere id-Liste → leere Map (kein N+1, kein Query)', () => {
    expect(tagsForMilestones(db, []).size).toBe(0)
  })
})
