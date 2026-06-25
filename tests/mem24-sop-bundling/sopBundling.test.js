// MEM-24 (MEM#8): SOP-Bundling — buildSopBundle + renderSopBundle.
// Bundle = getriggerte SOPs (DB) + Sprint-Header + Issue-Tabelle mit blocked_by (Dependencies).
// Eine Quelle für CLI + MCP (beide rendern `rendered`) → garantiert identischer Output (SOP-D04).
// Baut auf Migration 044 (sops/sop_triggers) + Baseline (sprints/backlog/issue_dependencies).

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import { upsertSop, setTrigger } from '../../server/lib/sops.js'
import { buildSopBundle, renderSopBundle } from '../../server/lib/sopBundle.js'

const PROJECT_ID = 7

describe('MEM-24 — SOP-Bundling: Komposition + Render + dependency-aware Tabelle', () => {
  let db
  let logDir
  let sprintId
  let mem23Id
  let mem24Id

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-mem24-'))
    applyMigration(db, '044_v3_sops.sql', { logDir })
    seedProject(db, { id: PROJECT_ID, slug: 'memory-system', name: 'Memory System', prefix: 'MEM' })

    sprintId = Number(db.prepare(`
      INSERT INTO sprints (name, status, project_id, project_number, goal, start_date, end_date, position)
      VALUES (?, 'active', ?, 8, ?, '2026-05-27', '2026-06-03', 1)
    `).run('SOP-Integration ins DevDashboard', PROJECT_ID, 'SOPs als DB-Entität + Bundling').lastInsertRowid)

    const insIssue = db.prepare(`
      INSERT INTO backlog (title, type, status, priority, project_id, project_number, assigned_sprint)
      VALUES (?, ?, 'planned', ?, ?, ?, ?)
    `)
    mem23Id = Number(insIssue.run('SOP-Entität', 'feature', 2, PROJECT_ID, 23, sprintId).lastInsertRowid)
    mem24Id = Number(insIssue.run('SOP-Bundling', 'feature', 2, PROJECT_ID, 24, sprintId).lastInsertRowid)

    // MEM-24 hängt an MEM-23 (depends_on → muss zuerst fertig sein).
    db.prepare('INSERT INTO issue_dependencies (issue_id, depends_on_id, note) VALUES (?, ?, ?)')
      .run(mem24Id, mem23Id, 'MEM#8')

    upsertSop(db, { sop_key: 'sprint-durchfuehrung', title: 'SOP - Sprint Durchfuehrung', content: '# Sprint Durchfuehrung\n\nSchritt 0: Projekt-Check.' })
    setTrigger(db, 'sprint:start', 'sprint-durchfuehrung', 0)
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('buildSopBundle: trigger liefert SOP-Volltext + Sprint-Header + Issues', () => {
    const bundle = buildSopBundle(db, { trigger: 'sprint:start', sprint: 'MEM#8', projectId: PROJECT_ID })
    expect(bundle.sops.map(s => s.sop_key)).toEqual(['sprint-durchfuehrung'])
    expect(bundle.sops[0].content).toContain('Projekt-Check')
    expect(bundle.sprint.key).toBe('MEM#8')
    expect(bundle.sprint.goal).toContain('Bundling')
    expect(bundle.issues.map(i => i.key)).toEqual(expect.arrayContaining(['MEM-23', 'MEM-24']))
  })

  test('buildSopBundle: blocked_by führt die Dependency-Keys (Build-Reihenfolge)', () => {
    const bundle = buildSopBundle(db, { trigger: 'sprint:start', sprint: 'MEM#8', projectId: PROJECT_ID })
    const mem24 = bundle.issues.find(i => i.key === 'MEM-24')
    const mem23 = bundle.issues.find(i => i.key === 'MEM-23')
    expect(mem24.blocked_by).toEqual(['MEM-23'])
    expect(mem23.blocked_by).toEqual([])
  })

  test('buildSopBundle: Sprint per numerischer id auflösbar', () => {
    const bundle = buildSopBundle(db, { trigger: 'sprint:start', sprint: String(sprintId), projectId: PROJECT_ID })
    expect(bundle.sprint.key).toBe('MEM#8')
    expect(bundle.issues.length).toBe(2)
  })

  test('buildSopBundle: ohne sprint → SOPs ohne Tabelle (issue:create-Fall)', () => {
    upsertSop(db, { sop_key: 'issues-erfassen', title: 'SOP - Issues erfassen', content: '# Erfassen' })
    setTrigger(db, 'issue:create', 'issues-erfassen', 0)
    const bundle = buildSopBundle(db, { trigger: 'issue:create', projectId: PROJECT_ID })
    expect(bundle.sops.map(s => s.sop_key)).toEqual(['issues-erfassen'])
    expect(bundle.sprint).toBeNull()
    expect(bundle.issues).toEqual([])
  })

  test('renderSopBundle: Markdown enthält SOP-Text, Sprint-Header und blocked_by-Spalte', () => {
    const bundle = buildSopBundle(db, { trigger: 'sprint:start', sprint: 'MEM#8', projectId: PROJECT_ID })
    const md = renderSopBundle(bundle)
    expect(md).toContain('Relevant SOP: SOP - Sprint Durchfuehrung')
    expect(md).toContain('Projekt-Check')
    expect(md).toContain('## Sprint: MEM#8 — SOP-Integration ins DevDashboard')
    expect(md).toContain('| Key | Titel | Status | Prio | blocked_by |')
    // MEM-24-Zeile zeigt MEM-23 als blocker.
    const mem24Row = md.split('\n').find(l => l.startsWith('| MEM-24 '))
    expect(mem24Row).toContain('MEM-23')
    expect(mem24Row).toContain('high') // priority_label
  })

  test('renderSopBundle: leeres Bundle → leerer String (kein Crash)', () => {
    const md = renderSopBundle({ trigger: null, sops: [], sprint: null, issues: [] })
    expect(md).toBe('')
  })
})
