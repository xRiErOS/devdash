import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import {
  closeMilestoneWithIssues,
  listOpenIssuesForMilestone,
  MilestoneCloseError,
  VALID_TARGETS,
  VALID_TERMINAL_STATUS,
} from '../../server/lib/milestoneClose.js'

// DD-277 — Backend-Helper-Coverage fuer Milestone-Close mit Issue-Triage.

function seedFixture(db, { milestoneStatus = 'planning' } = {}) {
  seedProject(db)
  // Milestone
  const ms = db.prepare(`
    INSERT INTO milestones (project_id, name, target_date, status, position)
    VALUES (?, ?, ?, ?, ?)
  `).run(2, 'M-DD-277', '2026-12-31', milestoneStatus, 10)
  const milestoneId = Number(ms.lastInsertRowid)

  // Sprint im Milestone
  const sp = db.prepare(`
    INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(2, 277, 'M277-Sprint', 'active', milestoneId, 1)
  const sprintId = Number(sp.lastInsertRowid)

  // Drei offene Issues + ein bereits done Issue (Kontroll-Probe).
  const insIssue = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status, assigned_sprint)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const a = insIssue.run(2, 901, 'Open A', 'feature', 'planned', sprintId)
  const b = insIssue.run(2, 902, 'Open B', 'bug', 'in_progress', sprintId)
  const c = insIssue.run(2, 903, 'Open C', 'improvement', 'to_review', sprintId)
  const d = insIssue.run(2, 904, 'Already Done', 'feature', 'done', sprintId)

  return {
    milestoneId,
    sprintId,
    ids: {
      a: Number(a.lastInsertRowid),
      b: Number(b.lastInsertRowid),
      c: Number(c.lastInsertRowid),
      d: Number(d.lastInsertRowid),
    },
  }
}

describe('DD-277 · listOpenIssuesForMilestone', () => {
  let db
  beforeEach(() => { db = createTestDb() })
  afterEach(() => { db.close() })

  test('liefert nur nicht-terminale Issues, sortiert nach priority+id', () => {
    const { milestoneId, ids } = seedFixture(db)
    const open = listOpenIssuesForMilestone(db, milestoneId)
    expect(open.map(i => i.id).sort()).toEqual([ids.a, ids.b, ids.c].sort())
    expect(open.find(i => i.id === ids.d)).toBeUndefined()
  })

  test('cancelled Issues werden ignoriert (DD-524)', () => {
    const { milestoneId, ids } = seedFixture(db)
    db.prepare("UPDATE backlog SET status = 'cancelled' WHERE id = ?").run(ids.b)
    const open = listOpenIssuesForMilestone(db, milestoneId)
    expect(open.map(i => i.id).sort()).toEqual([ids.a, ids.c].sort())
  })
})

describe('DD-277 · closeMilestoneWithIssues — Erfolgs-Pfade', () => {
  let db
  let auditCalls
  let auditFn
  beforeEach(() => {
    db = createTestDb()
    auditCalls = []
    auditFn = (table, recordId, action, oldVal, newVal, agentId) => {
      auditCalls.push({ table, recordId, action, oldVal, newVal, agentId })
    }
  })
  afterEach(() => { db.close() })

  test('alle drei Targets in einer Transaction (backlog/done/cancelled)', () => {
    const { milestoneId, ids } = seedFixture(db)
    const result = closeMilestoneWithIssues(db, {
      milestoneId,
      targetStatus: 'completed',
      assignments: [
        { issue_id: ids.a, target: 'backlog' },
        { issue_id: ids.b, target: 'done' },
        { issue_id: ids.c, target: 'cancelled' },
      ],
    }, { auditLog: auditFn })

    expect(result.processed).toHaveLength(3)
    expect(result.failed).toHaveLength(0)
    expect(result.target_status).toBe('completed')

    const a = db.prepare('SELECT status, assigned_sprint, milestone FROM backlog WHERE id = ?').get(ids.a)
    expect(a.status).toBe('refined')
    expect(a.assigned_sprint).toBeNull()
    expect(a.milestone).toBeNull()

    const b = db.prepare('SELECT status, completed_at FROM backlog WHERE id = ?').get(ids.b)
    expect(b.status).toBe('done')
    expect(b.completed_at).toBeTruthy()

    const c = db.prepare('SELECT status, completed_at, result FROM backlog WHERE id = ?').get(ids.c)
    expect(c.status).toBe('cancelled')
    expect(c.completed_at).toBeTruthy()
    expect(c.result).toContain('cancelled_reason')
    expect(c.result).toContain('M-DD-277')

    const milestone = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(milestone.status).toBe('completed')

    // 3 Issue-Audit-Rows + 1 Milestone-Audit-Row
    expect(auditCalls).toHaveLength(4)
    const actions = auditCalls.map(c => c.action).sort()
    expect(actions).toEqual([
      'milestone_close_backlog',
      'milestone_close_cancelled',
      'milestone_close_done',
      'status_change',
    ])
  })

  test('cancelled-target haengt result-Annex an (existierender result bleibt)', () => {
    const { milestoneId, ids } = seedFixture(db)
    db.prepare('UPDATE backlog SET result = ? WHERE id = ?').run('previous outcome', ids.c)
    closeMilestoneWithIssues(db, {
      milestoneId,
      targetStatus: 'completed',
      assignments: [
        { issue_id: ids.a, target: 'backlog' },
        { issue_id: ids.b, target: 'backlog' },
        { issue_id: ids.c, target: 'cancelled' },
      ],
    }, { auditLog: auditFn })
    const c = db.prepare('SELECT result FROM backlog WHERE id = ?').get(ids.c)
    expect(c.result.startsWith('previous outcome')).toBe(true)
    expect(c.result).toContain('cancelled_reason: "Milestone \\"M-DD-277\\" closed"')
  })

  test('target_status="cancelled" laesst Milestone selbst auf cancelled landen', () => {
    const { milestoneId, ids } = seedFixture(db)
    closeMilestoneWithIssues(db, {
      milestoneId,
      targetStatus: 'cancelled',
      assignments: [
        { issue_id: ids.a, target: 'cancelled' },
        { issue_id: ids.b, target: 'cancelled' },
        { issue_id: ids.c, target: 'cancelled' },
      ],
    }, { auditLog: auditFn })
    const m = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(m.status).toBe('cancelled')
  })

  test('Backlog-Target setzt new-Status nicht hoch (idempotent)', () => {
    const { milestoneId, sprintId } = seedFixture(db)
    const ins = db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, type, status, assigned_sprint)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(2, 905, 'Status-new', 'feature', 'new', sprintId)
    const id = Number(ins.lastInsertRowid)
    closeMilestoneWithIssues(db, {
      milestoneId,
      targetStatus: 'completed',
      assignments: [
        // Alle 4 offenen Issues abdecken (Pflicht): die 3 aus seedFixture + neuer
        ...listOpenIssuesForMilestone(db, milestoneId).map(i => ({ issue_id: i.id, target: 'backlog' })),
      ],
    }, { auditLog: auditFn })
    const row = db.prepare('SELECT status, assigned_sprint FROM backlog WHERE id = ?').get(id)
    expect(row.status).toBe('new') // wurde NICHT auf 'refined' hochgezogen
    expect(row.assigned_sprint).toBeNull()
  })
})

describe('DD-277 · closeMilestoneWithIssues — Fehler-Pfade', () => {
  let db
  beforeEach(() => { db = createTestDb() })
  afterEach(() => { db.close() })

  test('404 wenn Milestone nicht existiert', () => {
    expect(() => closeMilestoneWithIssues(db, {
      milestoneId: 9999, targetStatus: 'completed', assignments: [],
    })).toThrow(MilestoneCloseError)
    try {
      closeMilestoneWithIssues(db, { milestoneId: 9999, targetStatus: 'completed', assignments: [] })
    } catch (e) {
      expect(e.statusCode).toBe(404)
    }
  })

  test('400 bei ungueltigem target_status', () => {
    const { milestoneId } = seedFixture(db)
    try {
      closeMilestoneWithIssues(db, { milestoneId, targetStatus: 'open', assignments: [] })
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(MilestoneCloseError)
      expect(e.field).toBe('target_status')
    }
  })

  test('400 bei ungueltigem assignments[].target', () => {
    const { milestoneId, ids } = seedFixture(db)
    try {
      closeMilestoneWithIssues(db, {
        milestoneId, targetStatus: 'completed',
        assignments: [{ issue_id: ids.a, target: 'archive' }],
      })
      expect.fail('should throw')
    } catch (e) {
      expect(e.field).toBe('assignments[].target')
    }
  })

  test('400 wenn ein offenes Issue kein Assignment hat', () => {
    const { milestoneId, ids } = seedFixture(db)
    try {
      closeMilestoneWithIssues(db, {
        milestoneId, targetStatus: 'completed',
        assignments: [
          { issue_id: ids.a, target: 'backlog' },
          { issue_id: ids.b, target: 'done' },
          // ids.c fehlt
        ],
      })
      expect.fail('should throw')
    } catch (e) {
      expect(e.statusCode).toBe(400)
      expect(e.message).toMatch(/Fehlende assignments/)
    }
  })

  test('409 wenn Milestone bereits reached/cancelled ist', () => {
    const { milestoneId } = seedFixture(db, { milestoneStatus: 'completed' })
    try {
      closeMilestoneWithIssues(db, {
        milestoneId, targetStatus: 'completed', assignments: [],
      })
      expect.fail('should throw')
    } catch (e) {
      expect(e.statusCode).toBe(409)
    }
  })

  test('Transaction rollback: ungueltiges target im 2. assignment laesst keine Spuren', () => {
    const { milestoneId, ids } = seedFixture(db)
    try {
      closeMilestoneWithIssues(db, {
        milestoneId, targetStatus: 'completed',
        assignments: [
          { issue_id: ids.a, target: 'backlog' },
          { issue_id: ids.b, target: 'bogus' },
          { issue_id: ids.c, target: 'done' },
        ],
      })
      expect.fail('should throw on validation')
    } catch (e) {
      expect(e.field).toBe('assignments[].target')
    }
    // Validierung ist VOR der TX → DB-State unveraendert.
    const a = db.prepare('SELECT status, assigned_sprint FROM backlog WHERE id = ?').get(ids.a)
    expect(a.status).toBe('planned')
    expect(a.assigned_sprint).not.toBeNull()
    const m = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(m.status).toBe('planning')
  })
})

describe('DD-277 · API-Konstanten', () => {
  test('VALID_TARGETS', () => {
    expect([...VALID_TARGETS].sort()).toEqual(['backlog', 'cancelled', 'done'])
  })
  test('VALID_TERMINAL_STATUS', () => {
    expect([...VALID_TERMINAL_STATUS].sort()).toEqual(['cancelled', 'completed'])
  })
})

describe('DD-277 · MilestoneCloseDialog Source-Audit', () => {
  let dialogSrc
  let viewSrc

  test('Dialog hat data-ui + Radio-Group + Confirm-Button (DD-588: kanonisches ui/-Organism)', async () => {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { dirname, resolve } = await import('node:path')
    const here = dirname(fileURLToPath(import.meta.url))
    const repoRoot = resolve(here, '..', '..')
    // DD-588 Cutover: kanonisches Organism ist der neue Target.
    dialogSrc = readFileSync(resolve(repoRoot, 'src/components/ui/organisms/MilestoneCloseDialog.jsx'), 'utf8')
    // DD-588: ui/-Organism nutzt dataUiScope statt statischer data-testid am Dialog-Container.
    // Radio-Gruppe + Confirm-Button via Button-Atom (data-ui=${dataUiScope}.confirm).
    expect(dialogSrc).toMatch(/role=["']radiogroup["']/)
    expect(dialogSrc).toMatch(/onConfirm/)
    expect(dialogSrc).toMatch(/onCancel/)
    // DD-588: Container-Logik (POST close-with-issues + GET open-issues) ist nach
    // MilestoneDetail.jsx gehoben — im Organism nicht mehr vorhanden.
  })

  test('MilestoneDetail triggert Dialog beim Abschliessen mit offenen Issues', async () => {
    // DD-464 (455c): MilestoneView.jsx gelöscht. Der Close-Triage-Dialog ist
    // CRUD → wurde in MilestoneDetail.jsx migriert (Milestone-CRUD-Owner seit
    // 455a). DD-588: handleSetStatus prüft offene Issues und öffnet bei >0 den Dialog;
    // Container-Logik (fetch open-issues + POST close-with-issues) in MilestoneDetail.
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { dirname, resolve } = await import('node:path')
    const here = dirname(fileURLToPath(import.meta.url))
    const repoRoot = resolve(here, '..', '..')
    viewSrc = readFileSync(resolve(repoRoot, 'src/views/MilestoneDetail.jsx'), 'utf8')
    expect(viewSrc).toContain("import MilestoneCloseDialog from '../components/ui/organisms/MilestoneCloseDialog.jsx'")
    // Dialog wird beim Abschließen mit offenen Issues geöffnet.
    expect(viewSrc).toMatch(/setCloseDialog\(/)
    expect(viewSrc).toMatch(/\/open-issues/)
    expect(viewSrc).toMatch(/<MilestoneCloseDialog/)
    // DD-588: POST close-with-issues ist nach MilestoneDetail gehoben.
    expect(viewSrc).toMatch(/close-with-issues/)
  })
})
