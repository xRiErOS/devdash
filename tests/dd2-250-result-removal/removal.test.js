// DD2-250 / Welle 4 T04a — das result-Feld + der result-basierte 422-Blocker beim
// Sprint-Abschluss sind ersatzlos entfernt (Decision D14). Wissensbasis ist jetzt
// project_memory + Git-Historie, kein issue-gebundener Result-Blob mehr.
//
// Regression-Guard auf Quell-Ebene (Pattern wie das frühere dd360): pinnt, dass der
// Blocker NICHT zurückkehrt und dass die Vertrags-/Tool-Oberfläche das Feld nicht
// wieder einführt. Sprint-Abschluss ohne result-Doku darf NICHT mehr 422 werfen.

import { describe, test, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { closeMilestoneWithIssues } from '../../apps/backend/src/lib/milestoneClose.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

// Voll-migrierte DB inkl. der Drop-Migration 072 (result-Spalte existiert nicht mehr).
// Genau dieser Zustand deckte die grep-only-Guards NICHT ab — Konsumenten der Spalte
// werfen hier `SQLITE_ERROR: no such column: result`.
const DROP_MIGRATION = '072_v3_dd2_250_drop_backlog_result.sql'
const migratedDb = () => createTestDb({ upToVersion: DROP_MIGRATION })

describe('DD2-250 — result-Feld + 422-Blocker entfernt (D14)', () => {
  test('sprintCompleteGuards.js existiert nicht mehr', () => {
    expect(existsSync(join(ROOT, 'apps/backend/src/lib/sprintCompleteGuards.js'))).toBe(false)
  })

  test('api.js verweist nicht mehr auf den result-Guard', () => {
    const api = read('apps/backend/src/api.js')
    expect(api).not.toMatch(/sprintCompleteGuards/)
    expect(api).not.toMatch(/listSprintIssuesMissingResult/)
  })

  test('api.js hat keinen result-basierten 422-Block beim Sprint-Abschluss mehr', () => {
    const api = read('apps/backend/src/api.js')
    expect(api).not.toMatch(/result ist für completed\/passed Issues Pflicht/)
  })

  test('backlog-Contract trägt kein result-Feld mehr', () => {
    const contract = read('packages/api-types/backlog.contracts.js')
    expect(contract).not.toMatch(/^\s*result:\s*z\./m)
  })

  test("backlogUpdate NULLABLE_FIELDS enthält 'result' nicht mehr", () => {
    const upd = read('apps/backend/src/lib/backlogUpdate.js')
    expect(upd).not.toMatch(/'result'/)
  })

  test('MCP-Server hat das devd_issue_set_result-Tool nicht mehr', () => {
    const mcp = read('apps/cli/mcp/devd-mcp.js')
    expect(mcp).not.toMatch(/devd_issue_set_result/)
  })

  test('CLI hat den issue:set-result-Handler nicht mehr', () => {
    const cli = read('apps/cli/bin/devd-cli.js')
    expect(cli).not.toMatch(/'issue:set-result'/)
  })

  test('eine neue Drop-Migration entfernt die backlog.result-Spalte', () => {
    const mig = read('apps/backend/migrations/072_v3_dd2_250_drop_backlog_result.sql')
    expect(mig).toMatch(/ALTER TABLE backlog DROP COLUMN result/)
  })
})

// Verhaltens-Tests gegen eine voll-migrierte DB (inkl. 072). Fangen echte
// Spalten-Konsumenten, die die Quell-Guards oben durchrutschen ließen (B01).
describe('DD2-250 — Verhalten auf 072-migrierter DB', () => {
  test('072-Migration entfernt die result-Spalte tatsächlich aus dem Schema', () => {
    const db = migratedDb()
    const cols = db.prepare('PRAGMA table_info(backlog)').all().map((c) => c.name)
    expect(cols).not.toContain('result')
  })

  // B01: Milestone-Close mit cancelled-Triage las/schrieb backlog.result und warf
  // nach 072 `no such column: result`. Cancel-Grund liegt jetzt im auditLog.
  // Dieser Test wäre VOR dem Fix rot (SQLITE_ERROR) und ist danach grün.
  test('Milestone-Close (cancelled-Triage) wirft keinen result-Spaltenfehler', () => {
    const db = migratedDb()
    const pid = Number(
      db.prepare("INSERT INTO projects (slug,name,prefix) VALUES ('mc','MC','MC')").run().lastInsertRowid,
    )
    const mid = Number(
      db.prepare("INSERT INTO milestones (project_id,name,status,target_date) VALUES (?,?,?,?)")
        .run(pid, 'M', 'in_progress', '2099-01-01').lastInsertRowid,
    )
    const sid = Number(
      db.prepare("INSERT INTO sprints (project_id,name,status,milestone_id) VALUES (?,?,?,?)")
        .run(pid, 'S', 'in_progress', mid).lastInsertRowid,
    )
    const iid = Number(
      db.prepare("INSERT INTO backlog (project_id,title,type,status,assigned_sprint) VALUES (?,?,?,?,?)")
        .run(pid, 'I', 'feature', 'in_progress', sid).lastInsertRowid,
    )

    const audits = []
    let res
    expect(() => {
      res = closeMilestoneWithIssues(
        db,
        { milestoneId: mid, targetStatus: 'cancelled', assignments: [{ issue_id: iid, target: 'cancelled' }] },
        { auditLog: (...a) => audits.push(a) },
      )
    }).not.toThrow()

    // Issue ist storniert; kein Datenverlust — der Cancel-Grund steht im auditLog.
    expect(db.prepare('SELECT status FROM backlog WHERE id=?').get(iid).status).toBe('cancelled')
    expect(res.processed.find((p) => p.id === iid).to_status).toBe('cancelled')
    const cancelAudit = audits.find((a) => a[2] === 'milestone_close_cancelled')
    expect(cancelAudit).toBeDefined()
    expect(cancelAudit[4].reason).toMatch(/closed/)
  })

  // A: Sprint-Abschluss darf ohne result-Doku NICHT mehr blockieren. Der HTTP-Handler
  // (api.js) ist in diesem Harness nicht mountbar (Self-Start-Server, kein App-Export);
  // deshalb wird der Abschluss-Kern (passed→completed + Sprint→completed) direkt gegen
  // die 072-DB gefahren — er läuft result-frei durch. Die Abwesenheit des result-422
  // ist zusätzlich quell-seitig oben gepinnt.
  test('Sprint-Abschluss eines passed-Issues OHNE result läuft result-frei durch', () => {
    const db = migratedDb()
    const pid = Number(
      db.prepare("INSERT INTO projects (slug,name,prefix) VALUES ('sc','SC','SC')").run().lastInsertRowid,
    )
    const sid = Number(
      db.prepare("INSERT INTO sprints (project_id,name,status) VALUES (?,?,?)")
        .run(pid, 'S', 'to_review').lastInsertRowid,
    )
    const iid = Number(
      db.prepare("INSERT INTO backlog (project_id,title,type,status,assigned_sprint) VALUES (?,?,?,?,?)")
        .run(pid, 'Passed issue', 'feature', 'passed', sid).lastInsertRowid,
    )
    db.prepare(
      "INSERT INTO review_feedback (backlog_id, review_status, round_number) VALUES (?, 'passed', 1)",
    ).run(iid)

    // Abschluss-Kern des Endpunkts (api.js POST /api/sprints/:id/complete): passed→completed,
    // Sprint→completed. KEIN result-Zugriff — vor D14 hätte hier der result-422 geblockt.
    expect(() => {
      db.prepare("UPDATE backlog SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE id=?").run(iid)
      db.prepare("UPDATE sprints SET status='completed', end_date=COALESCE(end_date, ?) WHERE id=?")
        .run('2099-01-01', sid)
    }).not.toThrow()

    expect(db.prepare('SELECT status FROM backlog WHERE id=?').get(iid).status).toBe('completed')
    expect(db.prepare('SELECT status FROM sprints WHERE id=?').get(sid).status).toBe('completed')
  })
})
