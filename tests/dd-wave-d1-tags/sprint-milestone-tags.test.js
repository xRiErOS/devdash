// GF-2 Wave D — D1: additive Tag-Junctions sprint_tags + milestone_tags (D-K).
// Mirror des backlog_tags-Stacks (Migration 010, contracts/tag.contracts.js, PUT
// /api/backlog/:id/tags, issue:tag-set, devd_issue_tag_set). Contract funktional +
// Migration-Round-Trip (createTestDb) + Source-Presence-Wiring (Muster DD-624).
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { sprintTagsContract, milestoneTagsContract } from '@devd/api-types/tag.contracts.js'

const MIG = '055_v3_sprint_milestone_tags.sql'

describe('D1 — Contract (sprintTags/milestoneTags)', () => {
  test('sprintTagsContract: tag_ids-Array positiver Ganzzahlen (coerce, [] = clear)', () => {
    expect(sprintTagsContract.safeParse({ tag_ids: [1, 2] }).success).toBe(true)
    expect(sprintTagsContract.safeParse({ tag_ids: ['3'] }).success).toBe(true)
    expect(sprintTagsContract.safeParse({ tag_ids: [] }).success).toBe(true)
    expect(sprintTagsContract.safeParse({ tag_ids: [-1] }).success).toBe(false)
  })
  test('milestoneTagsContract: identische Shape wie issueTags', () => {
    expect(milestoneTagsContract.safeParse({ tag_ids: [1] }).success).toBe(true)
    expect(milestoneTagsContract.safeParse({ tag_ids: [0] }).success).toBe(false)
  })
})

describe('D1 — Migration 055 (additive Junctions, kein Polymorph-Bruch)', () => {
  test('sprint_tags + milestone_tags Tabellen existieren', () => {
    const db = createTestDb({ upToVersion: MIG })
    const tbls = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sprint_tags','milestone_tags')").all().map(r => r.name).sort()
    expect(tbls).toEqual(['milestone_tags', 'sprint_tags'])
  })

  test('sprint_tags Round-Trip + Cascade (sprint delete → junction weg)', () => {
    const db = createTestDb({ upToVersion: MIG })
    const pid = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('t','T','T')").run().lastInsertRowid
    const sid = db.prepare("INSERT INTO sprints (project_id, name, status) VALUES (?, 'S1', 'planning')").run(pid).lastInsertRowid
    const tid = db.prepare("INSERT INTO tags (project_id, name, color) VALUES (?, 'frontend', 'blue')").run(pid).lastInsertRowid
    db.prepare('INSERT INTO sprint_tags (sprint_id, tag_id) VALUES (?, ?)').run(sid, tid)
    const join = db.prepare('SELECT t.name FROM sprint_tags st JOIN tags t ON t.id = st.tag_id WHERE st.sprint_id = ?').all(sid)
    expect(join.map(r => r.name)).toEqual(['frontend'])
    db.prepare('DELETE FROM sprints WHERE id = ?').run(sid)
    expect(db.prepare('SELECT COUNT(*) c FROM sprint_tags WHERE sprint_id = ?').get(sid).c).toBe(0)
    // tag selbst bleibt bestehen (nur Junction weg)
    expect(db.prepare('SELECT COUNT(*) c FROM tags WHERE id = ?').get(tid).c).toBe(1)
  })

  test('milestone_tags Round-Trip + Cascade (milestone delete → junction weg)', () => {
    const db = createTestDb({ upToVersion: MIG })
    const pid = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('t','T','T')").run().lastInsertRowid
    const mid = db.prepare("INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, 'M1', '2026-09-01', 'planning')").run(pid).lastInsertRowid
    const tid = db.prepare("INSERT INTO tags (project_id, name, color) VALUES (?, 'gf-2', 'mauve')").run(pid).lastInsertRowid
    db.prepare('INSERT INTO milestone_tags (milestone_id, tag_id) VALUES (?, ?)').run(mid, tid)
    expect(db.prepare('SELECT COUNT(*) c FROM milestone_tags WHERE milestone_id = ?').get(mid).c).toBe(1)
    db.prepare('DELETE FROM milestones WHERE id = ?').run(mid)
    expect(db.prepare('SELECT COUNT(*) c FROM milestone_tags WHERE milestone_id = ?').get(mid).c).toBe(0)
  })
})

describe('D1 — Wiring (REST + CLI + MCP, Full-Stack D-E)', () => {
  const api = readFileSync('apps/backend/src/api.js', 'utf8')
  const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

  test('REST: PUT + GET tags-Endpoints für sprint + milestone', () => {
    expect(api).toContain("app.put('/api/sprints/:id/tags'")
    expect(api).toContain("app.get('/api/sprints/:id/tags'")
    expect(api).toContain("app.put('/api/milestones/:id/tags'")
    expect(api).toContain("app.get('/api/milestones/:id/tags'")
    expect(api).toContain('function tagsForSprint')
    expect(api).toContain('function tagsForMilestone')
  })

  test('CLI: sprint + milestone tag-set/remove/list', () => {
    for (const v of ['sprint:tag-set', 'sprint:tag-remove', 'sprint:tag-list', 'milestone:tag-set', 'milestone:tag-remove', 'milestone:tag-list']) {
      expect(cli).toContain(`'${v}'`)
    }
  })

  test('MCP: devd_{sprint,milestone}_tag_set/remove', () => {
    for (const t of ['devd_sprint_tag_set', 'devd_sprint_tag_remove', 'devd_milestone_tag_set', 'devd_milestone_tag_remove']) {
      expect(mcp).toContain(t)
    }
  })
})
