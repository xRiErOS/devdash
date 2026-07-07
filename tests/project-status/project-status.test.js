// devd_project_status: Ein-Call-Snapshot fuer LLM-Orientierung (Grill-Me-Decision-Log 2026-07-08).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, seedDependencies, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import { getProjectStatus } from '../../apps/backend/src/lib/projectStatus.js'
import { createDocument } from '../../apps/backend/src/lib/documents.js'
import { createMemory } from '../../apps/backend/src/lib/projectMemories.js'

const MIG = '075_v3_default_project_setting.sql'

describe('getProjectStatus', () => {
  let db

  beforeEach(() => {
    db = createTestDb({ upToVersion: MIG })
    seedProject(db)
  })
  afterEach(() => { db.close() })

  test('leeres Projekt: leere Arrays, Backlog-Total 0', () => {
    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.milestones).toEqual([])
    expect(status.orphan_sprints).toEqual([])
    expect(status.dependency_graph).toEqual({ milestones: [], sprints: [] })
    expect(status.backlog).toEqual({ by_priority: {}, total: 0 })
    expect(status.session_log_recent).toEqual([])
    expect(status.decisions_recent).toEqual([])
    expect(status.decisions_pinned).toEqual([])
  })

  test('offene Milestones mit genesteten offenen Sprints, geschlossene ausgefiltert', () => {
    const insM = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position) VALUES (?, ?, ?, ?, ?)
    `)
    const mOpen = Number(insM.run(TEST_PROJECT_ID, 'M offen', '2026-12-31', 'in_progress', 1).lastInsertRowid)
    insM.run(TEST_PROJECT_ID, 'M fertig', '2026-12-31', 'completed', 2)

    const insS = db.prepare(`
      INSERT INTO sprints (name, status, project_id, project_number, milestone_id) VALUES (?, ?, ?, ?, ?)
    `)
    const sOpen = Number(insS.run('S offen', 'planned', TEST_PROJECT_ID, 1, mOpen).lastInsertRowid)
    insS.run('S fertig', 'completed', TEST_PROJECT_ID, 2, mOpen)

    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.milestones).toEqual([
      {
        id: mOpen,
        name: 'M offen',
        status: 'in_progress',
        docs: [],
        sprints: [{ id: sOpen, key: 'DD#1', name: 'S offen', status: 'planned', docs: [] }],
      },
    ])
  })

  test('Sprints ohne Meilenstein landen in orphan_sprints, geschlossene ausgefiltert', () => {
    const insS = db.prepare(`
      INSERT INTO sprints (name, status, project_id, project_number) VALUES (?, ?, ?, ?)
    `)
    const orphan = Number(insS.run('Solo-Sprint', 'in_progress', TEST_PROJECT_ID, 1).lastInsertRowid)
    insS.run('Solo-Fertig', 'completed', TEST_PROJECT_ID, 2)

    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.orphan_sprints).toEqual([
      { id: orphan, key: 'DD#1', name: 'Solo-Sprint', status: 'in_progress', docs: [] },
    ])
  })

  test('Doc-Titel an Milestone+Sprint, archivierte Docs raus', () => {
    const insM = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position) VALUES (?, ?, ?, ?, ?)
    `)
    const mId = Number(insM.run(TEST_PROJECT_ID, 'M mit Docs', '2026-12-31', 'in_progress', 1).lastInsertRowid)
    const insS = db.prepare(`
      INSERT INTO sprints (name, status, project_id, project_number, milestone_id) VALUES (?, ?, ?, ?, ?)
    `)
    const sId = Number(insS.run('S mit Docs', 'planned', TEST_PROJECT_ID, 1, mId).lastInsertRowid)

    createDocument(db, { type: 'milestone', id: mId }, { title: 'Plan aktiv', status: 'active' })
    createDocument(db, { type: 'milestone', id: mId }, { title: 'Plan alt', status: 'archived' })
    createDocument(db, { type: 'sprint', id: sId }, { title: 'Sprint-Doc', status: 'draft' })

    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.milestones[0].docs).toEqual(['Plan aktiv'])
    expect(status.milestones[0].sprints[0].docs).toEqual(['Sprint-Doc'])
  })

  test('Milestone-Dependency-Graph: Kante nur wenn Predecessor ebenfalls offen', () => {
    const insM = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position) VALUES (?, ?, ?, ?, ?)
    `)
    const a = Number(insM.run(TEST_PROJECT_ID, 'A', '2026-12-31', 'in_progress', 1).lastInsertRowid)
    const b = Number(insM.run(TEST_PROJECT_ID, 'B', '2026-12-31', 'planned', 2).lastInsertRowid)
    const c = Number(insM.run(TEST_PROJECT_ID, 'C fertig', '2026-12-31', 'completed', 3).lastInsertRowid)

    seedDependencies(db, [[a, b], [c, a]]) // A->B (beide offen) / C->A (C fertig, raus)

    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.dependency_graph.milestones).toEqual([`${a} --> ${b}`])
  })

  test('Sprint-Dependency-Graph: Kante nur wenn Predecessor ebenfalls offen, Format nutzt Sprint-Key', () => {
    const insS = db.prepare(`
      INSERT INTO sprints (name, status, project_id, project_number) VALUES (?, ?, ?, ?)
    `)
    const s1 = Number(insS.run('S1', 'in_progress', TEST_PROJECT_ID, 1).lastInsertRowid)
    const s2 = Number(insS.run('S2', 'planned', TEST_PROJECT_ID, 2).lastInsertRowid)
    const s3 = Number(insS.run('S3 fertig', 'completed', TEST_PROJECT_ID, 3).lastInsertRowid)

    const insDep = db.prepare('INSERT INTO sprint_dependencies (predecessor_id, successor_id) VALUES (?, ?)')
    insDep.run(s1, s2) // beide offen -> Kante
    insDep.run(s3, s1) // Predecessor fertig -> raus

    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.dependency_graph.sprints).toEqual(['DD#1 --> DD#2'])
  })

  test('Backlog: Gruppierung nach Priority + Total, nur "new" oder "planned"-ohne-Sprint', () => {
    const sprintRow = db.prepare(`
      INSERT INTO sprints (name, status, project_id, project_number) VALUES ('Belegt', 'planned', ?, 1)
    `).run(TEST_PROJECT_ID)
    const sprintId = Number(sprintRow.lastInsertRowid)

    const insB = db.prepare(`
      INSERT INTO backlog (project_id, title, type, status, priority, assigned_sprint)
      VALUES (?, ?, 'feature', ?, ?, ?)
    `)
    insB.run(TEST_PROJECT_ID, 'B1', 'new', 1, null)
    insB.run(TEST_PROJECT_ID, 'B2', 'new', 1, null)
    insB.run(TEST_PROJECT_ID, 'B3', 'planned', 2, null)
    insB.run(TEST_PROJECT_ID, 'B4 belegt', 'planned', 3, sprintId)
    insB.run(TEST_PROJECT_ID, 'B5 fertig', 'completed', 1, null)
    insB.run(TEST_PROJECT_ID, 'B6 refined', 'refined', 4, null)

    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.backlog).toEqual({ by_priority: { 1: 2, 2: 1 }, total: 3 })
  })

  test('session_log: letzte 5 nach created_at DESC, kompakt ohne content', () => {
    const setCreatedAt = db.prepare('UPDATE project_memories SET created_at = ? WHERE id = ?')
    for (let i = 1; i <= 6; i++) {
      const m = createMemory(db, TEST_PROJECT_ID, { category: 'session_log', summary: `S${i}`, content: `Body ${i}` })
      setCreatedAt.run(`2026-07-0${i} 10:00:00`, m.id)
    }
    // Andere Kategorie darf nicht mit reinrutschen.
    createMemory(db, TEST_PROJECT_ID, { category: 'architecture_decision', summary: 'D1', content: 'x' })

    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.session_log_recent.map(r => r.summary)).toEqual(['S6', 'S5', 'S4', 'S3', 'S2'])
    expect(status.session_log_recent.every(r => !('content' in r))).toBe(true)
  })

  test('architecture_decision: letzte 5 nach created_at DESC + separat alle pinned (auch ausserhalb der 5)', () => {
    const setCreatedAt = db.prepare('UPDATE project_memories SET created_at = ? WHERE id = ?')
    for (let i = 1; i <= 6; i++) {
      const m = createMemory(db, TEST_PROJECT_ID, { category: 'architecture_decision', summary: `D${i}`, content: `Body ${i}` })
      setCreatedAt.run(`2026-07-0${i} 10:00:00`, m.id)
    }
    const pinned = createMemory(db, TEST_PROJECT_ID, {
      category: 'architecture_decision', summary: 'Alt aber pinned', content: 'x', pinned: true,
    })
    setCreatedAt.run('2026-01-01 00:00:00', pinned.id) // aelter als alle 6 -> faellt aus den "letzten 5" raus

    const status = getProjectStatus(db, TEST_PROJECT_ID)
    expect(status.decisions_recent.map(r => r.summary)).toEqual(['D6', 'D5', 'D4', 'D3', 'D2'])
    expect(status.decisions_recent.every(r => !('content' in r))).toBe(true)
    expect(status.decisions_pinned.map(r => r.summary)).toEqual(['Alt aber pinned'])
    expect(status.decisions_pinned.every(r => !('content' in r))).toBe(true)
  })
})

describe('Wiring (REST + MCP)', () => {
  const api = readFileSync('apps/backend/src/api.js', 'utf8')
  const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

  test('REST: GET /api/project-status', () => {
    expect(api).toContain("app.get('/api/project-status'")
    expect(api).toContain('getProjectStatus')
  })

  test('MCP: devd_project_status', () => {
    expect(mcp).toContain('devd_project_status')
  })
})
