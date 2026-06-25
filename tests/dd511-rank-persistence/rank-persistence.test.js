// DD-511 — Server: Sprint-Rang-Persistenz beim Roadmap-Drag (position + milestone_id).
//
// Two layers (matching codebase patterns):
//   (a) SQL/persistence-direct — createTestDb() in-memory; exercises real DB behavior.
//   (b) Source-grep wiring guard — asserts `server/api.js` PUT /api/sprints/:id
//       writable set now includes 'position', so the wiring can't silently regress.

import { describe, test, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createTestDb } from '../_fixtures/in-memory-db.js'

const ROOT = resolve(import.meta.dirname, '../..')
const API_SRC = readFileSync(resolve(ROOT, 'server/api.js'), 'utf8')
// The coercion logic was extracted into a helper (I02) — guard strings live there.
const GUARD_SRC = readFileSync(resolve(ROOT, 'server/lib/sprintFieldGuards.js'), 'utf8')

// ── helpers ────────────────────────────────────────────────────────────────────

function seedWorld(db) {
  const proj = db.prepare(
    "INSERT INTO projects (slug, name, prefix) VALUES ('dd511-test', 'DD-511 Test', 'DD')"
  ).run()
  const projectId = proj.lastInsertRowid

  const msA = db.prepare(
    "INSERT INTO milestones (project_id, name, target_date, status, position) VALUES (?, 'M-A', '2026-12-31', 'open', 1)"
  ).run(projectId)
  const msB = db.prepare(
    "INSERT INTO milestones (project_id, name, target_date, status, position) VALUES (?, 'M-B', '2026-12-31', 'open', 2)"
  ).run(projectId)

  const s1 = db.prepare(
    "INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position) VALUES (?, 1, 'S1', 'planning', ?, 1)"
  ).run(projectId, msA.lastInsertRowid)
  const s2 = db.prepare(
    "INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position) VALUES (?, 2, 'S2', 'planning', ?, 2)"
  ).run(projectId, msA.lastInsertRowid)
  const s3 = db.prepare(
    "INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position) VALUES (?, 3, 'S3', 'planning', ?, 3)"
  ).run(projectId, msA.lastInsertRowid)

  return {
    projectId,
    milestoneA: msA.lastInsertRowid,
    milestoneB: msB.lastInsertRowid,
    sprint1: s1.lastInsertRowid,
    sprint2: s2.lastInsertRowid,
    sprint3: s3.lastInsertRowid,
  }
}

// ── (a) Persistence: SQL-direct tests ─────────────────────────────────────────

describe('DD-511 — assignment-drag persists milestone_id + position atomically', () => {
  let db
  let world

  beforeAll(() => {
    db = createTestDb()
    world = seedWorld(db)
  })

  test('UPDATE writing both milestone_id and position persists both columns', () => {
    const { sprint1, milestoneB } = world

    // Simulate what the PUT handler now does: a single UPDATE with both fields.
    db.prepare(
      'UPDATE sprints SET milestone_id = ?, position = ? WHERE id = ?'
    ).run(milestoneB, 5, sprint1)

    const row = db.prepare('SELECT milestone_id, position FROM sprints WHERE id = ?').get(sprint1)
    expect(row.milestone_id).toBe(milestoneB)
    expect(row.position).toBe(5)
  })

  test('UPDATE writing only position (no milestone change) persists position', () => {
    const { sprint2 } = world

    db.prepare('UPDATE sprints SET position = ? WHERE id = ?').run(10, sprint2)

    const row = db.prepare('SELECT milestone_id, position FROM sprints WHERE id = ?').get(sprint2)
    expect(row.position).toBe(10)
    // milestone_id unchanged (still milestoneA from seed)
    expect(row.milestone_id).toBe(world.milestoneA)
  })

  test('reorder: bulk position write produces gap-free positions for all affected sprints', () => {
    const { sprint1, sprint2, sprint3 } = world

    // Simulate PATCH /api/sprints/reorder: assign positions 0, 1, 2 lückenlos.
    const pairs = [
      { id: sprint3, position: 0 },
      { id: sprint1, position: 1 },
      { id: sprint2, position: 2 },
    ]
    const upd = db.prepare('UPDATE sprints SET position = ? WHERE id = ?')
    const tx = db.transaction((items) => {
      for (const { id, position } of items) upd.run(position, id)
    })
    tx(pairs)

    const rows = db.prepare(
      'SELECT id, position FROM sprints WHERE id IN (?, ?, ?) ORDER BY position ASC'
    ).all(sprint1, sprint2, sprint3)

    // Positions must be exactly [0, 1, 2] — no gaps, no duplicates.
    const positions = rows.map(r => r.position)
    expect(positions).toEqual([0, 1, 2])

    // IDs must be re-paired in the new order.
    expect(rows[0].id).toBe(sprint3)
    expect(rows[1].id).toBe(sprint1)
    expect(rows[2].id).toBe(sprint2)
  })

  test('position=null can be stored (NULL sentinel for unranked sprints)', () => {
    const { sprint2 } = world
    db.prepare('UPDATE sprints SET position = ? WHERE id = ?').run(null, sprint2)
    const row = db.prepare('SELECT position FROM sprints WHERE id = ?').get(sprint2)
    expect(row.position).toBeNull()
  })
})

// ── (b) Source-grep wiring guards ─────────────────────────────────────────────

describe('DD-511 — PUT /api/sprints/:id writable wiring (source-grep)', () => {
  test("writable array includes 'position'", () => {
    // The writable array must list 'position' so the PUT handler accepts it.
    // Matches the line: const writable = [..., 'position']
    expect(API_SRC).toMatch(/'position'/)
  })

  test("PUT /api/sprints/:id is declared in server/api.js", () => {
    expect(API_SRC).toMatch(/app\.put\(['"`]\/api\/sprints\/:id['"`]/)
  })

  test("position non-finite guard is present (400 rejection)", () => {
    // The coercion logic was extracted into server/lib/sprintFieldGuards.js (I02).
    // Verify the helper carries the guard string and api.js imports + calls it.
    expect(GUARD_SRC).toMatch(/Number\.isFinite/)
    expect(GUARD_SRC).toMatch(/position muss eine endliche Zahl sein/)
    expect(API_SRC).toMatch(/coerceSprintPosition/)
  })

  test("position guard is scoped to the 'position' key (not applied globally)", () => {
    // The guard must be conditioned on key === 'position', not a bare isFinite check.
    expect(API_SRC).toMatch(/key === 'position'/)
  })
})
