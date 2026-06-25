// DD-291 — Milestone Defer-Flag
//
// Acceptance:
//  1. Migration 033 fügt milestones.deferred (INTEGER NOT NULL DEFAULT 0) hinzu.
//  2. GET /api/milestones (Default) filtert deferred=1 raus.
//  3. GET /api/milestones?include_deferred=true liefert ALLE.
//  4. PATCH /api/milestones/:id setzt deferred (true/false) + audit_log Eintrag.
//  5. PATCH-Round-Trip: nach defer=true wird Milestone aus Default-Listing
//     entfernt. Nach defer=false ist er wieder sichtbar.
//  6. GET /api/milestones/deferred-stats liefert deferred_count + deferred_sprints_count.
//
// Pattern wie dd290/dd292: Endpoint-Logik direkt gegen In-Memory-DB nachgebildet
// + Migration-Stack durchgespielt. Kein Express-Boot.

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'
const MIG_032 = '032_v3_api_keys.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'

// Replikat von GET /api/milestones (gekürzt, ohne Sprint-Subquery — für Filter-
// Tests reicht die Milestone-Selektion). 1:1 mit server/api.js Z. 1043-1056
// (post DD-291).
function fetchMilestonesList(db, projectId, { includeDeferred = false, statusFilter = 'open' } = {}) {
  const statusClause = statusFilter === 'all' ? '' : "AND status = 'open'"
  const deferredClause = includeDeferred ? '' : 'AND deferred = 0'
  return db.prepare(`
    SELECT id, name, description, target_date, status, created_at, position, deferred
    FROM milestones
    WHERE project_id = ? ${statusClause} ${deferredClause}
    ORDER BY position IS NULL, position ASC, status = 'open' DESC, target_date IS NULL, target_date ASC, id ASC
  `).all(projectId)
}

// Replikat von PATCH /api/milestones/:id (DD-291) — schaltet deferred-Flag um
// + schreibt audit_log Entry (action='milestone_defer').
function patchMilestoneDeferred(db, id, deferred) {
  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id)
  if (!milestone) return { status: 404 }
  const next = deferred ? 1 : 0
  const old = milestone.deferred ? 1 : 0
  if (old === next) return { status: 200, body: milestone }
  db.prepare('UPDATE milestones SET deferred = ? WHERE id = ?').run(next, id)
  db.prepare(`
    INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, agent_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('milestones', id, 'milestone_defer',
    JSON.stringify({ deferred: old }),
    JSON.stringify({ deferred: next }),
    'ui')
  return { status: 200, body: db.prepare('SELECT * FROM milestones WHERE id = ?').get(id) }
}

// Replikat von GET /api/milestones/deferred-stats.
function fetchDeferredStats(db, projectId) {
  const deferredRows = db.prepare(`
    SELECT id, name FROM milestones
    WHERE project_id = ? AND deferred = 1
    ORDER BY position IS NULL, position ASC, id ASC
  `).all(projectId)
  const deferredIds = deferredRows.map(r => r.id)
  let deferredSprintsCount = 0
  if (deferredIds.length > 0) {
    const placeholders = deferredIds.map(() => '?').join(',')
    const row = db.prepare(`
      SELECT COUNT(*) AS c FROM sprints
      WHERE project_id = ? AND milestone_id IN (${placeholders})
    `).get(projectId, ...deferredIds)
    deferredSprintsCount = row?.c || 0
  }
  return {
    deferred_count: deferredRows.length,
    deferred_sprints_count: deferredSprintsCount,
    milestones: deferredRows,
  }
}

describe('DD-291 — Milestone Defer-Flag', () => {
  let db
  let logDir
  let projectId
  let msAlpha     // deferred=0
  let msBeta      // deferred=1
  let msGamma     // deferred=0, has Sprint
  let sprintBetaId

  beforeAll(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd291-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
    applyMigration(db, MIG_032, { logDir })
    applyMigration(db, MIG_033, { logDir })

    const proj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd291', 'DD-291', 'DD')").run()
    projectId = Number(proj.lastInsertRowid)

    const a = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-Alpha', '2026-06-01', 'open', 1)
    `).run(projectId)
    msAlpha = Number(a.lastInsertRowid)

    // M-Beta wird sofort als deferred angelegt — über UPDATE, weil INSERT nicht
    // alle Spalten füllt (deferred hat aber Default 0, das passt).
    const b = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-Beta', '2026-07-01', 'open', 2)
    `).run(projectId)
    msBeta = Number(b.lastInsertRowid)
    db.prepare('UPDATE milestones SET deferred = 1 WHERE id = ?').run(msBeta)

    const g = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-Gamma', '2026-08-01', 'open', 3)
    `).run(projectId)
    msGamma = Number(g.lastInsertRowid)

    // 1 Sprint, der zu M-Beta (deferred) gehört → soll im RoadmapBoard
    // ausgeblendet werden (Frontend-Filter). Backend liefert ihn dennoch.
    const sp = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position)
      VALUES (?, 1, 'Sprint-Beta-1', 'planning', ?, 1)
    `).run(projectId, msBeta)
    sprintBetaId = Number(sp.lastInsertRowid)
  })

  afterAll(() => {
    if (db) db.close()
    if (logDir) rmSync(logDir, { recursive: true, force: true })
  })

  // AC1 — Migration spielt sauber.
  test('AC1: Migration 033 fügt deferred-Spalte hinzu (NOT NULL DEFAULT 0)', () => {
    const cols = db.prepare("PRAGMA table_info(milestones)").all()
    const deferredCol = cols.find(c => c.name === 'deferred')
    expect(deferredCol).toBeDefined()
    expect(deferredCol.type.toUpperCase()).toBe('INTEGER')
    expect(deferredCol.notnull).toBe(1)
    expect(String(deferredCol.dflt_value)).toBe('0')
  })

  test('AC1b: Migration legt Index idx_milestones_deferred an', () => {
    const indexes = db.prepare("PRAGMA index_list(milestones)").all()
    const idx = indexes.find(i => i.name === 'idx_milestones_deferred')
    expect(idx).toBeDefined()
  })

  // AC3 — Default-View filtert deferred=1 raus.
  test('AC3: GET /api/milestones (Default) blendet deferred Milestones aus', () => {
    const list = fetchMilestonesList(db, projectId)
    const ids = list.map(m => m.id)
    expect(ids).toContain(msAlpha)
    expect(ids).toContain(msGamma)
    expect(ids).not.toContain(msBeta)
  })

  // AC6 — include_deferred=true liefert ALLE.
  test('AC6: GET /api/milestones?include_deferred=true liefert auch deferred', () => {
    const list = fetchMilestonesList(db, projectId, { includeDeferred: true })
    const ids = list.map(m => m.id)
    expect(ids).toContain(msAlpha)
    expect(ids).toContain(msBeta)
    expect(ids).toContain(msGamma)
    const beta = list.find(m => m.id === msBeta)
    expect(beta.deferred).toBe(1)
  })

  // AC4/AC7 — PATCH-Round-Trip: setzen + zurücksetzen.
  test('AC4/AC7: PATCH deferred=true blendet aus, deferred=false macht wieder sichtbar', () => {
    // Step 1: msAlpha auf deferred=true setzen.
    const r1 = patchMilestoneDeferred(db, msAlpha, true)
    expect(r1.status).toBe(200)
    expect(r1.body.deferred).toBe(1)

    // Default-Listing zeigt msAlpha jetzt NICHT.
    const list1 = fetchMilestonesList(db, projectId)
    expect(list1.map(m => m.id)).not.toContain(msAlpha)

    // Step 2: msAlpha wieder reaktivieren.
    const r2 = patchMilestoneDeferred(db, msAlpha, false)
    expect(r2.status).toBe(200)
    expect(r2.body.deferred).toBe(0)

    const list2 = fetchMilestonesList(db, projectId)
    expect(list2.map(m => m.id)).toContain(msAlpha)
  })

  // AC4 — audit_log Entry mit action='milestone_defer'.
  test('AC4: PATCH erzeugt audit_log Entry milestone_defer', () => {
    // Anzahl vorher.
    const before = db.prepare(
      "SELECT COUNT(*) AS c FROM audit_log WHERE table_name='milestones' AND action='milestone_defer' AND record_id=?"
    ).get(msGamma).c

    patchMilestoneDeferred(db, msGamma, true)
    const after = db.prepare(
      "SELECT COUNT(*) AS c FROM audit_log WHERE table_name='milestones' AND action='milestone_defer' AND record_id=?"
    ).get(msGamma).c
    expect(after).toBe(before + 1)

    const row = db.prepare(
      "SELECT old_value, new_value FROM audit_log WHERE table_name='milestones' AND action='milestone_defer' AND record_id=? ORDER BY id DESC LIMIT 1"
    ).get(msGamma)
    expect(JSON.parse(row.old_value)).toEqual({ deferred: 0 })
    expect(JSON.parse(row.new_value)).toEqual({ deferred: 1 })

    // Cleanup für Folge-Tests.
    patchMilestoneDeferred(db, msGamma, false)
  })

  // No-op: identischer Wert → keine audit_log-Mutation.
  test('PATCH no-op: identischer Wert erzeugt keinen audit_log Entry', () => {
    const before = db.prepare(
      "SELECT COUNT(*) AS c FROM audit_log WHERE table_name='milestones' AND action='milestone_defer' AND record_id=?"
    ).get(msAlpha).c

    patchMilestoneDeferred(db, msAlpha, false)
    const after = db.prepare(
      "SELECT COUNT(*) AS c FROM audit_log WHERE table_name='milestones' AND action='milestone_defer' AND record_id=?"
    ).get(msAlpha).c
    expect(after).toBe(before)
  })

  // deferred-stats Endpoint.
  test('GET /api/milestones/deferred-stats: deferred_count + deferred_sprints_count', () => {
    const stats = fetchDeferredStats(db, projectId)
    // Aktueller Zustand: msBeta deferred=1, alle anderen 0.
    expect(stats.deferred_count).toBe(1)
    expect(stats.milestones.map(m => m.id)).toEqual([msBeta])
    // M-Beta hat 1 Sprint zugeordnet.
    expect(stats.deferred_sprints_count).toBe(1)
  })

  test('GET /api/milestones/deferred-stats: 0 wenn nichts deferred', () => {
    // msBeta temporär reaktivieren.
    patchMilestoneDeferred(db, msBeta, false)
    const stats = fetchDeferredStats(db, projectId)
    expect(stats.deferred_count).toBe(0)
    expect(stats.deferred_sprints_count).toBe(0)
    // Rückgängig.
    patchMilestoneDeferred(db, msBeta, true)
  })

  // status=open + deferred-Filter kombinieren.
  test('Default (status=open) + deferred-Filter kombinieren', () => {
    // msBeta deferred=1, status=open → kommt im Default NICHT.
    const list = fetchMilestonesList(db, projectId, { statusFilter: 'open' })
    expect(list.map(m => m.id)).not.toContain(msBeta)

    // status=all + include_deferred → ALLE.
    const allList = fetchMilestonesList(db, projectId, { statusFilter: 'all', includeDeferred: true })
    expect(allList.map(m => m.id)).toEqual(expect.arrayContaining([msAlpha, msBeta, msGamma]))
  })
})
