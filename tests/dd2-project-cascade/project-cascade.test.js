// Projekt-Kaskade (CLI/MCP/TUI Capability-Gap): projectDeletePreview (Counts) +
// cascadeDeleteProject (transaktional im Route-Handler) gegen eine echte
// In-Memory-DB (Snapshot-Schema, FK=ON). Verifiziert, dass ein Projekt-Teardown
// den kompletten Kind-Graph des Ziel-Projekts abreißt und ein Kontroll-Projekt
// samt seiner Daten unangetastet lässt.

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { projectDeletePreview, cascadeDeleteProject } from '../../apps/backend/src/lib/cascadeDelete.js'

function seedProject(db, slug, prefix) {
  const pid = db.prepare('INSERT INTO projects (slug, name, prefix) VALUES (?, ?, ?)').run(slug, slug.toUpperCase(), prefix).lastInsertRowid
  const mid = db.prepare("INSERT INTO milestones (project_id, name, status, position, target_date) VALUES (?, 'M', 'new', 1, '2026-12-31')").run(pid).lastInsertRowid
  let num = 0
  const sprint = () => {
    num++
    return db.prepare("INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position) VALUES (?, ?, ?, 'new', ?, 1)")
      .run(pid, num, 'S' + num, mid).lastInsertRowid
  }
  const s1 = sprint(), s2 = sprint()
  let inum = 0
  const issue = (sid) => {
    inum++
    return db.prepare("INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint) VALUES (?, ?, ?, 'new', 'feature', 3, ?)")
      .run(pid, inum, 'I' + inum, sid).lastInsertRowid
  }
  const a = issue(s1), b = issue(s1), d = issue(s2)   // 3 sprint-Issues
  inum++
  const orphan = db.prepare("INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint) VALUES (?, ?, 'orphan', 'new', 'feature', 3, NULL)")
    .run(pid, inum).lastInsertRowid   // 1 sprintloses Issue
  // Nicht-kaskadierende Issue-Kinder
  db.prepare('INSERT INTO review_feedback (backlog_id) VALUES (?)').run(a)
  db.prepare('INSERT INTO issue_dependencies (issue_id, depends_on_id) VALUES (?, ?)').run(a, b)
  // CASCADE-Kind am Projekt selbst
  const tid = db.prepare("INSERT INTO tags (project_id, name) VALUES (?, 't')").run(pid).lastInsertRowid
  return { pid, mid, s1, s2, a, b, d, orphan, tid }
}

describe('Projekt-Kaskade', () => {
  let db, P, C
  beforeEach(() => {
    // upToVersion='999' wendet ALLE Migrationen nach dem Snapshot an (String-Sort:
    // jede "0xx…"-Datei < "999") → project_memories/user_notes/project_todos existieren,
    // die projectDeletePreview zählt.
    db = createTestDb({ upToVersion: '999' })
    P = seedProject(db, 'target', 'TGT')
    C = seedProject(db, 'control', 'CTL')
  })

  const count = (sql, ...args) => db.prepare(sql).get(...args).c

  test('projectDeletePreview zählt den Kind-Graph des Projekts', () => {
    const p = projectDeletePreview(db, P.pid)
    expect(p.project_id).toBe(P.pid)
    expect(p.sprints).toBe(2)
    expect(p.backlog).toBe(4)      // 3 sprint + 1 orphan
    expect(p.milestones).toBe(1)
    expect(p.tags).toBe(1)
  })

  test('cascadeDeleteProject räumt Sprints, Issues, Kinder, Milestones, Tags + Projekt', () => {
    db.transaction(() => cascadeDeleteProject(db, P.pid))()

    // Projekt selbst weg
    expect(count('SELECT COUNT(*) c FROM projects WHERE id = ?', P.pid)).toBe(0)
    // Sprints + Backlog (inkl. Orphan) weg
    expect(count('SELECT COUNT(*) c FROM sprints WHERE project_id = ?', P.pid)).toBe(0)
    expect(count('SELECT COUNT(*) c FROM backlog WHERE project_id = ?', P.pid)).toBe(0)
    // Milestones + Tags via FK-CASCADE weg
    expect(count('SELECT COUNT(*) c FROM milestones WHERE project_id = ?', P.pid)).toBe(0)
    expect(count('SELECT COUNT(*) c FROM tags WHERE project_id = ?', P.pid)).toBe(0)
    // Nicht-kaskadierende Issue-Kinder des Projekts explizit weg (Control behält seine)
    expect(count('SELECT COUNT(*) c FROM review_feedback WHERE backlog_id = ?', P.a)).toBe(0)
    expect(count('SELECT COUNT(*) c FROM issue_dependencies WHERE issue_id = ?', P.a)).toBe(0)
    // Control-Kinder überleben
    expect(count('SELECT COUNT(*) c FROM review_feedback WHERE backlog_id = ?', C.a)).toBe(1)
  })

  test('Kontroll-Projekt bleibt vollständig unberührt', () => {
    db.transaction(() => cascadeDeleteProject(db, P.pid))()
    expect(count('SELECT COUNT(*) c FROM projects WHERE id = ?', C.pid)).toBe(1)
    expect(count('SELECT COUNT(*) c FROM sprints WHERE project_id = ?', C.pid)).toBe(2)
    expect(count('SELECT COUNT(*) c FROM backlog WHERE project_id = ?', C.pid)).toBe(4)
    expect(count('SELECT COUNT(*) c FROM milestones WHERE project_id = ?', C.pid)).toBe(1)
    expect(count('SELECT COUNT(*) c FROM tags WHERE project_id = ?', C.pid)).toBe(1)
  })
})
