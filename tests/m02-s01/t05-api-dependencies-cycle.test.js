import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import {
  detectCycle,
  findCyclePath,
  insertDependency,
  getDependenciesForMilestone,
} from '../../server/lib/milestoneDependencies.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'

describe('T05 — DFS Cycle-Detection (6 Topologie-Cases)', () => {
  let db
  let logDir
  let m

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m05-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    const ids = seedMilestones(db, [
      { name: 'M-1', target_date: '2026-06-01' },
      { name: 'M-2', target_date: '2026-07-01' },
      { name: 'M-3', target_date: '2026-08-01' },
      { name: 'M-4', target_date: '2026-09-01' },
    ])
    m = { m1: ids[0], m2: ids[1], m3: ids[2], m4: ids[3] }
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Case 1 — Linear M1→M2→M3, POST M3→M4: OK (kein Cycle)', () => {
    insertDependency(db, { predecessor_id: m.m1, successor_id: m.m2 })
    insertDependency(db, { predecessor_id: m.m2, successor_id: m.m3 })
    expect(detectCycle(db, { predecessor_id: m.m3, successor_id: m.m4 })).toBe(false)
    expect(() => insertDependency(db, { predecessor_id: m.m3, successor_id: m.m4 })).not.toThrow()
  })

  test('Case 2 — Branching M1→M2, M1→M3, POST M2→M4: OK', () => {
    insertDependency(db, { predecessor_id: m.m1, successor_id: m.m2 })
    insertDependency(db, { predecessor_id: m.m1, successor_id: m.m3 })
    expect(detectCycle(db, { predecessor_id: m.m2, successor_id: m.m4 })).toBe(false)
  })

  test('Case 3 — Cycle-3-Knoten: M1→M2→M3, POST M3→M1 → CYCLE_DETECTED + path', () => {
    insertDependency(db, { predecessor_id: m.m1, successor_id: m.m2 })
    insertDependency(db, { predecessor_id: m.m2, successor_id: m.m3 })
    expect(detectCycle(db, { predecessor_id: m.m3, successor_id: m.m1 })).toBe(true)
    const path = findCyclePath(db, { predecessor_id: m.m3, successor_id: m.m1 })
    expect(path).toEqual([m.m3, m.m1, m.m2, m.m3])

    try {
      insertDependency(db, { predecessor_id: m.m3, successor_id: m.m1 })
      expect.fail('should throw CYCLE_DETECTED')
    } catch (err) {
      expect(err.statusCode).toBe(409)
      expect(err.code).toBe('CYCLE_DETECTED')
      expect(err.path).toEqual([m.m3, m.m1, m.m2, m.m3])
    }
  })

  test('Case 4 — Direkter Cycle: M1→M2 existiert, POST M2→M1 → CYCLE_DETECTED', () => {
    insertDependency(db, { predecessor_id: m.m1, successor_id: m.m2 })
    try {
      insertDependency(db, { predecessor_id: m.m2, successor_id: m.m1 })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(409)
      expect(err.code).toBe('CYCLE_DETECTED')
    }
  })

  test('Case 5 — Self-Loop: POST M1→M1 → 400 SELF_LOOP', () => {
    try {
      insertDependency(db, { predecessor_id: m.m1, successor_id: m.m1 })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('SELF_LOOP')
    }
  })

  test('Case 6 — Missing FK: POST M99→M2 → 400 MISSING_FK', () => {
    try {
      insertDependency(db, { predecessor_id: 99999, successor_id: m.m2 })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('MISSING_FK')
    }
  })

  test('Finding #9: Duplikat-Insert (M1,M2) zweimal → 409 DUPLICATE mit code', () => {
    insertDependency(db, { predecessor_id: m.m1, successor_id: m.m2 })
    try {
      insertDependency(db, { predecessor_id: m.m1, successor_id: m.m2 })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(409)
      expect(err.code).toBe('DUPLICATE')
    }
  })

  test('Finding #1 (Sub): INVALID_ID — predecessor_id=0 oder negativ wird abgelehnt', () => {
    try {
      insertDependency(db, { predecessor_id: 0, successor_id: m.m2 })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('INVALID_ID')
    }
    try {
      insertDependency(db, { predecessor_id: -1, successor_id: m.m2 })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('INVALID_ID')
    }
  })

  test('getDependenciesForMilestone liefert predecessors + successors korrekt', () => {
    insertDependency(db, { predecessor_id: m.m1, successor_id: m.m2 })
    insertDependency(db, { predecessor_id: m.m3, successor_id: m.m2 })
    insertDependency(db, { predecessor_id: m.m2, successor_id: m.m4 })

    const deps = getDependenciesForMilestone(db, m.m2)
    expect(deps.predecessors.map(p => p.name).sort()).toEqual(['M-1', 'M-3'])
    expect(deps.successors.map(s => s.name)).toEqual(['M-4'])
  })
})
