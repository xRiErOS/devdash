import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import {
  insertDodItem,
  patchDodItem,
  deleteDodItem,
  listDodItems,
  reorderDodItems,
} from '../../apps/backend/src/lib/milestoneDodItems.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'
const MIG_054 = '054_v3_milestone_dod_items_details.sql'

describe('T06 — DoD-Items CRUD + Reorder', () => {
  let db
  let logDir
  let m

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m06-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
    applyMigration(db, MIG_054, { logDir })
    const ids = seedMilestones(db, [
      { name: 'M-1', target_date: '2026-06-01' },
      { name: 'M-2', target_date: '2026-07-01' },
    ])
    m = { m1: ids[0], m2: ids[1] }
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('insertDodItem: 3 sequenzielle Inserts setzen position 1, 2, 3 atomar', () => {
    const i1 = insertDodItem(db, m.m1, { label: 'Task A' })
    const i2 = insertDodItem(db, m.m1, { label: 'Task B' })
    const i3 = insertDodItem(db, m.m1, { label: 'Task C' })
    expect(i1.position).toBe(1)
    expect(i2.position).toBe(2)
    expect(i3.position).toBe(3)
    expect(listDodItems(db, m.m1).map(i => i.label)).toEqual(['Task A', 'Task B', 'Task C'])
  })

  test('insertDodItem: 400 LABEL_REQUIRED bei leerem label', () => {
    try {
      insertDodItem(db, m.m1, { label: '   ' })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('LABEL_REQUIRED')
    }
  })

  test('insertDodItem: 404 MILESTONE_NOT_FOUND bei nicht-existierender Milestone', () => {
    try {
      insertDodItem(db, 99999, { label: 'Test' })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(404)
      expect(err.code).toBe('MILESTONE_NOT_FOUND')
    }
  })

  test('patchDodItem: done=1 + label-Update setzen updated_at neu', async () => {
    const { id } = insertDodItem(db, m.m1, { label: 'Original' })
    const before = listDodItems(db, m.m1)[0]
    await new Promise(r => setTimeout(r, 1100))
    const after = patchDodItem(db, id, { label: 'Renamed', done: 1 })
    expect(after.label).toBe('Renamed')
    expect(after.done).toBe(1)
    expect(after.updated_at >= before.updated_at).toBe(true)
  })

  test('patchDodItem: 400 INVALID_DONE bei done=2', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'X' })
    try {
      patchDodItem(db, id, { done: 2 })
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('INVALID_DONE')
    }
  })

  test('reorderDodItems: [id3, id1, id2] setzt position 1,2,3', () => {
    const i1 = insertDodItem(db, m.m1, { label: 'A' })
    const i2 = insertDodItem(db, m.m1, { label: 'B' })
    const i3 = insertDodItem(db, m.m1, { label: 'C' })

    const reordered = reorderDodItems(db, m.m1, [i3.id, i1.id, i2.id])
    expect(reordered.map(i => i.label)).toEqual(['C', 'A', 'B'])
    expect(reordered.map(i => i.position)).toEqual([1, 2, 3])
  })

  test('reorderDodItems: 400 PARTIAL_REORDER wenn Array zu kurz', () => {
    insertDodItem(db, m.m1, { label: 'A' })
    insertDodItem(db, m.m1, { label: 'B' })
    insertDodItem(db, m.m1, { label: 'C' })

    try {
      reorderDodItems(db, m.m1, [1, 2])
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('PARTIAL_REORDER')
    }
  })

  test('reorderDodItems: 400 FOREIGN_ID bei ID einer anderen Milestone', () => {
    const i1 = insertDodItem(db, m.m1, { label: 'A' })
    const i2 = insertDodItem(db, m.m1, { label: 'B' })
    const x = insertDodItem(db, m.m2, { label: 'Other' })

    try {
      reorderDodItems(db, m.m1, [i1.id, x.id])
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('FOREIGN_ID')
    }
  })

  test('deleteDodItem: 204 + 404 bei wiederholtem delete', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'ToDelete' })
    expect(deleteDodItem(db, id)).toBe(true)
    try {
      deleteDodItem(db, id)
      expect.fail('should throw')
    } catch (err) {
      expect(err.statusCode).toBe(404)
    }
  })

  test('DELETE milestone cascadiert auf DoD-Items', () => {
    insertDodItem(db, m.m1, { label: 'A' })
    insertDodItem(db, m.m1, { label: 'B' })
    db.prepare('DELETE FROM milestones WHERE id = ?').run(m.m1)
    expect(listDodItems(db, m.m1)).toEqual([])
  })

  // ── details-Feld (D10, Migration 054) ────────────────────────────────────────

  test('insertDodItem: details optional — ohne details → NULL in DB', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'NoDetails' })
    const row = listDodItems(db, m.m1).find(i => i.id === id)
    expect(row.details).toBeNull()
  })

  test('insertDodItem: mit details → wird persistiert (getrimmt)', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'WithDetails', details: '  Beschreibung  ' })
    const row = listDodItems(db, m.m1).find(i => i.id === id)
    expect(row.details).toBe('Beschreibung')
  })

  test('insertDodItem: details als leerer String → NULL', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'EmptyDetails', details: '   ' })
    const row = listDodItems(db, m.m1).find(i => i.id === id)
    expect(row.details).toBeNull()
  })

  test('patchDodItem: details setzen', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'Patch' })
    const after = patchDodItem(db, id, { details: 'Neue Beschreibung' })
    expect(after.details).toBe('Neue Beschreibung')
  })

  test('patchDodItem: details ändern', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'Change', details: 'Alt' })
    const after = patchDodItem(db, id, { details: 'Neu' })
    expect(after.details).toBe('Neu')
  })

  test('patchDodItem: details löschen via leerem String → NULL', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'Del', details: 'Vorhanden' })
    const after = patchDodItem(db, id, { details: '' })
    expect(after.details).toBeNull()
  })

  test('patchDodItem: details löschen via null → NULL', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'DelNull', details: 'Vorhanden' })
    const after = patchDodItem(db, id, { details: null })
    expect(after.details).toBeNull()
  })

  test('patchDodItem: label+done ohne details — details bleibt erhalten', () => {
    const { id } = insertDodItem(db, m.m1, { label: 'Keep', details: 'Behalten' })
    const after = patchDodItem(db, id, { label: 'KeepRenamed', done: 1 })
    expect(after.label).toBe('KeepRenamed')
    expect(after.done).toBe(1)
    expect(after.details).toBe('Behalten')
  })
})
