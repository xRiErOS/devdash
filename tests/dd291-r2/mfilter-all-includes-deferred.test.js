// DD-291 R2 — `mfilter=all` muss deferred Milestones einblenden
//
// PO-Reject (Round 1):
//   https://devdash.familie-riedel.org/milestones?mfilter=all
//   "Zurückgestellte Meilensteine werden nicht eingeblendet."
//
// Root Cause:
//   MilestoneView.jsx → reload() setzte bei mfilter=all NUR ?status=all,
//   aber NICHT include_deferred=true. Beide Backend-Flags sind orthogonal
//   (vgl. server/api.js Z. 1056-1063): status=all liefert open+reached+cancelled,
//   include_deferred=true liefert deferred=1. Ohne beide bleibt deferred unsichtbar.
//
// Fix (DD-291 R2):
//   reload() sendet im "Alle"-Modus jetzt ?status=all&include_deferred=true.
//   Default-Modus ("Offen") bleibt unverändert (kein deferred, nur status=open).
//
// Tests in dieser Datei:
//   1. Backend-Filter-Kombination liefert deferred (Replikat von /api/milestones).
//   2. Source-Grep: MilestoneView.jsx setzt include_deferred=true im all-Modus.
//   3. Source-Grep: defaultMode lädt deferred NICHT.

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import { mkdtempSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'

const __dirname291 = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT291 = join(__dirname291, '..', '..')
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'
const MIG_032 = '032_v3_api_keys.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'

// Replikat des GET-/api/milestones-WHERE-Clauses (server/api.js Z. 1056-1068).
// Wir testen nur Selektion + Filter — Sprint-Subquery ist für diesen Fix irrelevant.
function fetchMilestonesList(db, projectId, { includeDeferred = false, statusFilter = 'open' } = {}) {
  const statusClause = statusFilter === 'all' ? '' : "AND status = 'open'"
  const deferredClause = includeDeferred ? '' : 'AND deferred = 0'
  return db.prepare(`
    SELECT id, name, status, deferred
    FROM milestones
    WHERE project_id = ? ${statusClause} ${deferredClause}
    ORDER BY id ASC
  `).all(projectId)
}

describe('DD-291 R2 — mfilter=all blendet deferred Milestones ein', () => {
  let db
  let logDir
  let projectId
  let msOpen       // status=open, deferred=0
  let msReached    // status=reached, deferred=0
  let msDeferred   // status=open, deferred=1
  let msReachedDeferred // status=reached, deferred=1 (Edge-Case)

  beforeAll(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd291-r2-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
    applyMigration(db, MIG_032, { logDir })
    applyMigration(db, MIG_033, { logDir })

    const proj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd291r2', 'DD-291 R2', 'DD')").run()
    projectId = Number(proj.lastInsertRowid)

    const open = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-Open', '2026-06-01', 'open', 1)
    `).run(projectId)
    msOpen = Number(open.lastInsertRowid)

    const reached = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-Reached', '2026-05-01', 'reached', 2)
    `).run(projectId)
    msReached = Number(reached.lastInsertRowid)

    const deferred = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-Deferred', '2026-07-01', 'open', 3)
    `).run(projectId)
    msDeferred = Number(deferred.lastInsertRowid)
    db.prepare('UPDATE milestones SET deferred = 1 WHERE id = ?').run(msDeferred)

    const reachedDeferred = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-ReachedDeferred', '2026-04-01', 'reached', 4)
    `).run(projectId)
    msReachedDeferred = Number(reachedDeferred.lastInsertRowid)
    db.prepare('UPDATE milestones SET deferred = 1 WHERE id = ?').run(msReachedDeferred)
  })

  afterAll(() => {
    if (db) db.close()
    if (logDir) rmSync(logDir, { recursive: true, force: true })
  })

  // Reproduziert den PO-Bug: Default-View (open) zeigt deferred nicht — ok,
  // ist gewollt. Filter "Alle" OHNE include_deferred zeigt ihn aber AUCH NICHT
  // — das war der Bug.
  test('Repro: status=all OHNE include_deferred=true verbirgt deferred (Bug-Verhalten)', () => {
    const list = fetchMilestonesList(db, projectId, { statusFilter: 'all', includeDeferred: false })
    const ids = list.map(m => m.id)
    expect(ids).toContain(msOpen)
    expect(ids).toContain(msReached)
    // ↓ Bug: deferred Milestones fehlen
    expect(ids).not.toContain(msDeferred)
    expect(ids).not.toContain(msReachedDeferred)
  })

  // Fix-Verhalten: mit beiden Flags kombiniert sind ALLE 4 Milestones im Listing.
  test('Fix: status=all + include_deferred=true liefert ALLE Milestones', () => {
    const list = fetchMilestonesList(db, projectId, { statusFilter: 'all', includeDeferred: true })
    const ids = list.map(m => m.id)
    expect(ids).toEqual(expect.arrayContaining([msOpen, msReached, msDeferred, msReachedDeferred]))
    expect(ids).toHaveLength(4)

    // Deferred-Flag wird mitgeliefert, sodass MilestoneCard den State-D-Indikator
    // (dashed Border + EyeOff-Badge) korrekt rendern kann.
    const deferred = list.find(m => m.id === msDeferred)
    expect(deferred.deferred).toBe(1)
    const reachedDeferred = list.find(m => m.id === msReachedDeferred)
    expect(reachedDeferred.deferred).toBe(1)
    expect(reachedDeferred.status).toBe('reached')
  })

  // Default-Modus (Offen) bleibt unangetastet — keine Regression.
  test('Default (status=open) bleibt deferred-frei (keine Regression)', () => {
    const list = fetchMilestonesList(db, projectId, { statusFilter: 'open', includeDeferred: false })
    const ids = list.map(m => m.id)
    expect(ids).toContain(msOpen)
    expect(ids).not.toContain(msReached)         // reached → ausgefiltert
    expect(ids).not.toContain(msDeferred)        // deferred → ausgefiltert
    expect(ids).not.toContain(msReachedDeferred) // beides → erst recht ausgefiltert
  })
})

// ─────────────────────────────────────────────────────────────────────
// Source-Grep — verifiziert dass MilestoneView.jsx die richtigen Query-Params setzt.
// Frontend-Render-Tests sind hier overkill — der Fix ist ein 1-Zeilen-String.
// ─────────────────────────────────────────────────────────────────────

describe('DD-291 R2 — RoadmapBoard lädt deferred Milestones (Container-Fetch)', () => {
  // DD-510 (DD#62): MilestoneView.jsx + Swimlane-Modus gelöscht. Der Milestone-
  // Fetch lebt im Spalten-Board RoadmapBoard.jsx und lädt weiterhin
  // /api/milestones?status=all&include_deferred=true (beide Flags unbedingt),
  // sodass deferred Milestones als Spalten sichtbar bleiben.
  // DD-510 removal: der MilestoneCard-Defer-Indikator-Assert (las das gelöschte
  // SwimlaneMode.jsx) und der bucket-Payload-Assert (Swimlane-Buckets entfallen)
  // sind STRUCK und entfernt.
  const container = readFileSync(join(REPO_ROOT291, 'src/views/RoadmapBoard.jsx'), 'utf-8')

  test('Container-Fetch enthält include_deferred=true', () => {
    expect(container).toMatch(/\?status=all&include_deferred=true/)
  })

  test('Container-Fetch enthält status=all', () => {
    expect(container).toMatch(/status=all/)
  })
})
